-- Portfolio schema: blog posts, moderated comments, portfolio projects, contact messages.
-- All timestamps are timestamptz and always written/read in UTC (see src/db.js).

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT 'Admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Case-insensitive uniqueness without relying on a collation that folds accents.
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_lower_key ON admin_users (lower(email));

CREATE TABLE IF NOT EXISTS posts (
  id           SERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  excerpt      TEXT NOT NULL DEFAULT '',
  body_md      TEXT NOT NULL DEFAULT '',
  cover_image  TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_published_idx ON posts (published_at DESC) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS comments (
  id           SERIAL PRIMARY KEY,
  post_id      INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  author_name  TEXT NOT NULL,
  author_email TEXT,
  body         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS comments_post_approved_idx ON comments (post_id, created_at) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS comments_pending_idx ON comments (created_at DESC) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL DEFAULT '',
  tech        TEXT[] NOT NULL DEFAULT '{}',
  live_url    TEXT,
  repo_url    TEXT,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  body        TEXT NOT NULL,
  handled     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
