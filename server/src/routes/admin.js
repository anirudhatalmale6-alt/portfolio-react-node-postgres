import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import slugify from 'slugify';
import { z } from 'zod';
import { query } from '../db.js';
import { issueSession, clearSession, requireAdmin } from '../auth.js';

export const adminRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts, please wait 15 minutes.' },
});

adminRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Email and password are required' });

    const { rows } = await query(
      'SELECT id, email, password_hash, display_name FROM admin_users WHERE lower(email) = lower($1)',
      [parsed.data.email],
    );
    const user = rows[0];
    // Same message and roughly the same work either way, so the response cannot be
    // used to find out which email addresses exist.
    const ok = user
      ? await bcrypt.compare(parsed.data.password, user.password_hash)
      : await bcrypt.compare(parsed.data.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
    if (!ok) return res.status(401).json({ error: 'Email or password is incorrect' });

    issueSession(res, user);
    res.json({ ok: true, admin: { email: user.email, name: user.display_name } });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

adminRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: { email: req.admin.email, name: req.admin.name } });
});

/* ---------------------------------------------------------------- posts --- */

const postSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().max(200).optional().or(z.literal('')),
  excerpt: z.string().trim().max(500).optional().or(z.literal('')),
  body_md: z.string().max(200000).optional().or(z.literal('')),
  cover_image: z.string().trim().max(500).optional().or(z.literal('')),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  status: z.enum(['draft', 'published']).optional(),
  // ISO-8601 string or null; omit entirely to let publishing stamp "now".
  published_at: z.string().datetime().nullable().optional(),
});

async function uniqueSlug(base, excludeId = null) {
  const root = slugify(base, { lower: true, strict: true }).slice(0, 80) || 'post';
  let candidate = root;
  for (let n = 2; ; n += 1) {
    const { rows } = await query('SELECT id FROM posts WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)', [
      candidate,
      excludeId,
    ]);
    if (rows.length === 0) return candidate;
    candidate = `${root}-${n}`;
  }
}

adminRouter.get('/posts', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.slug, p.title, p.excerpt, p.status, p.published_at, p.updated_at, p.tags,
              (SELECT count(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'pending')::int AS pending_comments
         FROM posts p
        ORDER BY coalesce(p.published_at, p.updated_at) DESC`,
    );
    res.json({ posts: rows });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/posts/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ post: rows[0] });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/posts', requireAdmin, async (req, res, next) => {
  try {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const d = parsed.data;
    const slug = await uniqueSlug(d.slug || d.title);
    const status = d.status || 'draft';
    // A post published without an explicit date is stamped at publish time, not at
    // creation time, so a draft written last week does not surface dated last week.
    const publishedAt = d.published_at ?? (status === 'published' ? new Date().toISOString() : null);

    const { rows } = await query(
      `INSERT INTO posts (slug, title, excerpt, body_md, cover_image, tags, status, published_at)
       VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7, $8)
       RETURNING *`,
      [slug, d.title, d.excerpt || '', d.body_md || '', d.cover_image || '', d.tags || [], status, publishedAt],
    );
    res.status(201).json({ post: rows[0] });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/posts/:id', requireAdmin, async (req, res, next) => {
  try {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const d = parsed.data;

    const { rows: existing } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Post not found' });
    const prev = existing[0];

    const slug = d.slug && d.slug !== prev.slug ? await uniqueSlug(d.slug, prev.id) : prev.slug;
    const status = d.status || prev.status;
    let publishedAt = prev.published_at;
    if (d.published_at !== undefined) {
      publishedAt = d.published_at;
    } else if (status === 'published' && !prev.published_at) {
      // First time it goes live: stamp now. Re-publishing an already-dated post keeps
      // its original date instead of jumping to today.
      publishedAt = new Date().toISOString();
    }

    const { rows } = await query(
      `UPDATE posts
          SET slug = $1, title = $2, excerpt = $3, body_md = $4, cover_image = NULLIF($5, ''),
              tags = $6, status = $7, published_at = $8, updated_at = now()
        WHERE id = $9
        RETURNING *`,
      [
        slug,
        d.title,
        d.excerpt ?? prev.excerpt,
        d.body_md ?? prev.body_md,
        d.cover_image ?? prev.cover_image ?? '',
        d.tags || prev.tags,
        status,
        publishedAt,
        prev.id,
      ],
    );
    res.json({ post: rows[0] });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/posts/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------- comments --- */

adminRouter.get('/comments', requireAdmin, async (req, res, next) => {
  try {
    const status = ['pending', 'approved', 'spam'].includes(req.query.status) ? req.query.status : 'pending';
    const { rows } = await query(
      `SELECT c.id, c.author_name, c.author_email, c.body, c.status, c.created_at,
              p.title AS post_title, p.slug AS post_slug
         FROM comments c
         JOIN posts p ON p.id = c.post_id
        WHERE c.status = $1
        ORDER BY c.created_at DESC
        LIMIT 200`,
      [status],
    );
    res.json({ comments: rows, status });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/comments/counts', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT status, count(*)::int AS n FROM comments GROUP BY status');
    const counts = { pending: 0, approved: 0, spam: 0 };
    for (const r of rows) counts[r.status] = r.n;
    res.json({ counts });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/comments/:id', requireAdmin, async (req, res, next) => {
  try {
    const parsed = z.object({ status: z.enum(['pending', 'approved', 'spam']) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'status must be pending, approved or spam' });
    const { rows } = await query(
      `UPDATE comments SET status = $1, reviewed_at = now() WHERE id = $2 RETURNING id, status`,
      [parsed.data.status, req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json({ comment: rows[0] });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/comments/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM comments WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------- messages --- */

adminRouter.get('/messages', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, body, handled, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 200',
    );
    res.json({ messages: rows });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/messages/:id', requireAdmin, async (req, res, next) => {
  try {
    const parsed = z.object({ handled: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'handled must be true or false' });
    const { rows } = await query('UPDATE contact_messages SET handled = $1 WHERE id = $2 RETURNING id, handled', [
      parsed.data.handled,
      req.params.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ message: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------- projects --- */

const projectSchema = z.object({
  title: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(1000).optional().or(z.literal('')),
  tech: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  live_url: z.string().trim().max(500).optional().or(z.literal('')),
  repo_url: z.string().trim().max(500).optional().or(z.literal('')),
  image_url: z.string().trim().max(500).optional().or(z.literal('')),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

adminRouter.post('/projects', requireAdmin, async (req, res, next) => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const d = parsed.data;
    const { rows } = await query(
      `INSERT INTO projects (title, summary, tech, live_url, repo_url, image_url, sort_order)
       VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), $7) RETURNING *`,
      [d.title, d.summary || '', d.tech || [], d.live_url || '', d.repo_url || '', d.image_url || '', d.sort_order ?? 0],
    );
    res.status(201).json({ project: rows[0] });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/projects/:id', requireAdmin, async (req, res, next) => {
  try {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const d = parsed.data;
    const { rows } = await query(
      `UPDATE projects SET title = $1, summary = $2, tech = $3, live_url = NULLIF($4, ''),
              repo_url = NULLIF($5, ''), image_url = NULLIF($6, ''), sort_order = $7
        WHERE id = $8 RETURNING *`,
      [
        d.title,
        d.summary || '',
        d.tech || [],
        d.live_url || '',
        d.repo_url || '',
        d.image_url || '',
        d.sort_order ?? 0,
        req.params.id,
      ],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ project: rows[0] });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/projects/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
