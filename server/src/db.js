import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

// Managed Postgres (Render, Neon, Supabase) requires TLS; a local container does not.
const needsSsl = /\bsslmode=require\b/.test(process.env.DATABASE_URL) || process.env.PGSSL === 'true';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 10),
  // Every connection talks UTC, so a timestamp never depends on where the server
  // happens to be running or which region the database was provisioned in. Set as a
  // startup option rather than a post-connect query so it is in force for the very
  // first statement on the connection.
  options: '-c timezone=UTC',
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err.message);
});

export function query(text, params) {
  return pool.query(text, params);
}
