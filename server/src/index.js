import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { pool } from './db.js';
import { jwtSecret } from './auth.js';

// Refuse to boot with a weak or missing signing key rather than discovering it at
// the first login attempt in production.
jwtSecret();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Render/Railway put the app behind a proxy; without this the rate limiter sees
// every request as coming from the same address.
app.set('trust proxy', 1);

const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// A disallowed origin simply gets no CORS header - the browser then blocks it. Throwing
// here would turn every such request into a 500, including same-origin asset requests
// that Chrome sends an Origin header for (Vite marks its bundles `crossorigin`).
app.use(
  cors((req, cb) => {
    const origin = req.headers.origin;
    let allowed = !origin || origins.includes(origin);
    if (!allowed) {
      try {
        // In production this process serves the built front end too, so the page's own
        // origin is always allowed however the deploy URL ends up spelled.
        allowed = new URL(origin).host === req.headers.host;
      } catch {
        allowed = false;
      }
    }
    cb(null, { origin: allowed, credentials: true });
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT now() AT TIME ZONE \'UTC\' AS db_time');
    // A body only this app emits, so a stray service on the same port cannot pass
    // for a healthy deploy.
    res.json({ ok: true, service: 'portfolio-api', db_time: rows[0].db_time });
  } catch (err) {
    res.status(503).json({ ok: false, service: 'portfolio-api', error: err.message });
  }
});

app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

// In production the built React app is served by this same process, so there is one
// service, one domain and no CORS in play.
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));

app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server' : err.message });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`portfolio-api listening on :${port}`);
});
