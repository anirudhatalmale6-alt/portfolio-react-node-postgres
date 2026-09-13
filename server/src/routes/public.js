import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../db.js';
import { renderMarkdown, cleanCommentText } from '../render.js';

export const publicRouter = Router();

const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this address, please try again later.' },
});

const POST_LIST_COLUMNS = `id, slug, title, excerpt, cover_image, tags, published_at`;

publicRouter.get('/posts', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const tag = typeof req.query.tag === 'string' && req.query.tag ? req.query.tag : null;

    const { rows } = await query(
      `SELECT ${POST_LIST_COLUMNS},
              (SELECT count(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'approved')::int AS comment_count
         FROM posts p
        WHERE status = 'published'
          AND published_at <= now()
          AND ($1::text IS NULL OR $1 = ANY (tags))
        ORDER BY published_at DESC
        LIMIT $2 OFFSET $3`,
      [tag, limit, offset],
    );

    const { rows: countRows } = await query(
      `SELECT count(*)::int AS total
         FROM posts
        WHERE status = 'published' AND published_at <= now()
          AND ($1::text IS NULL OR $1 = ANY (tags))`,
      [tag],
    );

    res.json({ posts: rows, total: countRows[0].total, limit, offset });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/posts/:slug', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, slug, title, excerpt, body_md, cover_image, tags, published_at
         FROM posts
        WHERE slug = $1 AND status = 'published' AND published_at <= now()`,
      [req.params.slug],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const post = rows[0];
    const { rows: comments } = await query(
      `SELECT id, author_name, body, created_at
         FROM comments
        WHERE post_id = $1 AND status = 'approved'
        ORDER BY created_at ASC`,
      [post.id],
    );

    const { body_md, ...rest } = post;
    res.json({ post: { ...rest, body_html: renderMarkdown(body_md) }, comments });
  } catch (err) {
    next(err);
  }
});

const commentSchema = z.object({
  author_name: z.string().trim().min(2).max(80),
  author_email: z.string().trim().email().max(200).optional().or(z.literal('')),
  body: z.string().trim().min(2).max(4000),
  // Honeypot: a real browser never fills this in, bots fill everything.
  website: z.string().max(0).optional(),
});

publicRouter.post('/posts/:slug/comments', writeLimiter, async (req, res, next) => {
  try {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] });
    }

    const { rows } = await query(
      `SELECT id FROM posts WHERE slug = $1 AND status = 'published' AND published_at <= now()`,
      [req.params.slug],
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const body = cleanCommentText(parsed.data.body);
    const name = cleanCommentText(parsed.data.author_name);
    if (!body || !name) return res.status(400).json({ error: 'Comment cannot be empty' });

    await query(
      `INSERT INTO comments (post_id, author_name, author_email, body, status)
       VALUES ($1, $2, NULLIF($3, ''), $4, 'pending')`,
      [rows[0].id, name, parsed.data.author_email || '', body],
    );

    res.status(201).json({ ok: true, message: 'Thanks! Your comment will appear once it has been approved.' });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/projects', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, title, summary, tech, live_url, repo_url, image_url
         FROM projects ORDER BY sort_order ASC, id ASC`,
    );
    res.json({ projects: rows });
  } catch (err) {
    next(err);
  }
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  body: z.string().trim().min(5).max(4000),
  website: z.string().max(0).optional(),
});

publicRouter.post('/contact', writeLimiter, async (req, res, next) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message, field: parsed.error.issues[0].path[0] });
    }
    await query('INSERT INTO contact_messages (name, email, body) VALUES ($1, $2, $3)', [
      cleanCommentText(parsed.data.name),
      parsed.data.email,
      cleanCommentText(parsed.data.body),
    ]);
    res.status(201).json({ ok: true, message: 'Thanks for getting in touch - I will reply soon.' });
  } catch (err) {
    next(err);
  }
});
