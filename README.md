# Personal portfolio — React + Node + PostgreSQL

A portfolio site with a blog: visitors read posts and leave comments, comments are held
for approval, and you write and publish posts yourself from an admin panel. No
redeploying to add an article.

```
client/   React (Vite) — the public site and the admin panel
server/   Node + Express — REST API, serves the built client in production
```

## What is in it

**Public site**
- Home page with intro, skills and a projects grid
- Blog index with tag filtering, post pages with Markdown bodies
- Comment form on every post — comments are held for review, not published on submit
- Contact form that drops messages into the admin inbox
- Works on a phone, and follows the visitor's light/dark preference

**Admin panel** (`/admin`)
- Write, edit, publish, schedule and delete posts (Markdown, tags, cover image, slug)
- Approve / mark-spam / delete comments, with a count of what is waiting
- Read contact messages and mark them handled

**Security**
- Comments and contact messages are stripped of HTML before they are stored
- Post bodies are sanitised on render, so nothing can inject script into a page
- Admin passwords are bcrypt hashed; the session is an httpOnly, signed cookie
- Rate limiting on the public write endpoints and on login
- The server refuses to start without a real `JWT_SECRET`

## Running it locally

You need Node 18+ and a PostgreSQL database.

```bash
# 1. database — or use any Postgres you already have
podman run -d --name portfolio-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_USER=devuser \
  -e POSTGRES_DB=portfolio -p 5432:5432 postgres:16-alpine

# 2. API
cd server
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate               # create the tables
npm run seed                  # optional: demo posts and comments
npm run create-admin -- you@example.com "a-strong-password" "Your Name"
npm run dev                   # http://localhost:4000

# 3. front end (second terminal)
cd client
npm install
npm run dev                   # http://localhost:5173
```

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Making it yours

| What | Where |
| --- | --- |
| Your name, intro, links, skills | `client/src/site.config.js` |
| Colours, fonts, spacing, radius | the token block at the top of `client/src/styles.css` |
| Posts, projects, comments | the admin panel — nothing in code |

## Tests

```bash
cd server && node test/smoke.mjs        # 43 API checks against a running server
cd client && python3 test/visual.py     # screenshots every screen + checks it rendered
```

The API suite checks the things that are quietly easy to get wrong: that an unapproved
comment is genuinely not visible to the public, that admin routes are closed without a
session, that a draft 404s, that a post scheduled in the future stays hidden, and that
publishing stamps the real publish time rather than the creation date.

The visual suite opens every screen in light and dark, at desktop and phone widths, and
fails if any screen is stuck on "Loading", shows a raw database date to a human, or logs
a console error.

## Deploying

Two moving parts: a Postgres database, and one Node service that serves both the API and
the built React app — one origin, so no CORS to configure and the session cookie just
works.

```bash
# build command
cd client && npm install && npm run build && cd ../server && npm install && npm run migrate
# start command
cd server && npm start
```

Environment variables the service needs:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | from your Postgres provider (keep `?sslmode=require` if it has one) |
| `JWT_SECRET` | 32+ random characters, not the one from any example |
| `NODE_ENV` | `production` — this is what makes the session cookie secure-only |
| `CORS_ORIGIN` | your domain, e.g. `https://yourdomain.com` |

After the first deploy, create your admin login once:

```bash
npm run create-admin -- you@example.com "a-strong-password" "Your Name"
```

`render.yaml` in the repo root describes exactly this setup if you deploy on Render.
