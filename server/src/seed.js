import { pool } from './db.js';

// Demo content so the site has something to look at before the real copy arrives.
// Dates are relative to now() rather than literals, so the demo never looks stale and
// never lands in the future for a visitor in another timezone.
const posts = [
  {
    slug: 'why-i-rebuilt-my-portfolio',
    title: 'Why I rebuilt my portfolio from scratch',
    excerpt: 'A template got me online in a weekend. Two years later it was the reason nobody stayed.',
    tags: ['writing', 'career'],
    days_ago: 3,
    body: `Every developer portfolio starts the same way: a template, a hero image, three
project cards with placeholder screenshots. Mine lasted two years before I admitted it
was doing nothing for me.

## What was actually wrong

The site described what I could do. It never showed anybody *doing* it. A visitor had to
take my word for the skills list and then leave.

## What I changed

- A blog, so there is a reason to come back.
- Project write-ups with the decisions in them, not just the stack.
- A comment box, because the conversations are the interesting part.

The stack is React, Node and Postgres - deliberately boring, because the writing is
supposed to be the interesting bit, not the framework.`,
  },
  {
    slug: 'postgres-for-small-projects',
    title: "Postgres is not overkill for a site nobody's visiting yet",
    excerpt: 'The "just use a flat file" advice costs you the day you need a second table.',
    tags: ['postgres', 'backend'],
    days_ago: 11,
    body: `There is a recurring bit of advice that a personal site does not need a real
database. Markdown files in a folder, ship it, move on.

It works right up to the moment you want something a file cannot do - comments, drafts
with a publish date, a tag you can filter on. Then you are writing a database badly.

## The bit that actually matters

Store timestamps as \`timestamptz\` and make every connection talk UTC. A date column
that quietly records the server's local time is the kind of bug that only shows up once
you move hosting - which, for a portfolio, is exactly what happens the first time you go
live.`,
  },
  {
    slug: 'shipping-beats-polishing',
    title: 'Shipping beats polishing',
    excerpt: 'Four unfinished side projects taught me more about scope than any blog post.',
    tags: ['writing'],
    days_ago: 24,
    body: `I have four side projects in a folder that nobody will ever see. Each one is
about 80% done and each one stalled at the same point: the moment the interesting
problem was solved and the boring work started.

The one project I did finish is the only one anybody has ever asked me about.`,
  },
];

const projects = [
  {
    title: 'This site',
    summary: 'React + Node + Postgres portfolio with a blog, moderated comments and an admin panel.',
    tech: ['React', 'Node.js', 'Express', 'PostgreSQL'],
    sort_order: 1,
  },
  {
    title: 'Placeholder project two',
    summary: 'Replace this from the admin panel - Projects tab - with something real.',
    tech: ['React', 'TypeScript'],
    sort_order: 2,
  },
];

const comments = [
  { slug: 'why-i-rebuilt-my-portfolio', name: 'Priya', body: 'The project write-ups point is spot on. Stack lists tell me nothing.', status: 'approved', hours_ago: 30 },
  { slug: 'why-i-rebuilt-my-portfolio', name: 'Sam', body: 'Curious what you used for the comments - rolled your own?', status: 'approved', hours_ago: 12 },
  { slug: 'postgres-for-small-projects', name: 'anon', body: 'CHEAP WATCHES BEST PRICE click here', status: 'pending', hours_ago: 5 },
  { slug: 'postgres-for-small-projects', name: 'Dana', body: 'The UTC point bit me last year on a Render deploy. Learned it the hard way.', status: 'pending', hours_ago: 2 },
];

async function run() {
  for (const p of posts) {
    await pool.query(
      `INSERT INTO posts (slug, title, excerpt, body_md, tags, status, published_at)
       VALUES ($1, $2, $3, $4, $5, 'published', now() - ($6 || ' days')::interval)
       ON CONFLICT (slug) DO UPDATE
         SET title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, body_md = EXCLUDED.body_md,
             tags = EXCLUDED.tags, status = 'published', published_at = EXCLUDED.published_at,
             updated_at = now()`,
      [p.slug, p.title, p.excerpt, p.body, p.tags, String(p.days_ago)],
    );
  }

  for (const c of comments) {
    await pool.query(
      `INSERT INTO comments (post_id, author_name, body, status, created_at)
       SELECT id, $2, $3, $4, now() - ($5 || ' hours')::interval FROM posts WHERE slug = $1`,
      [c.slug, c.name, c.body, c.status, String(c.hours_ago)],
    );
  }

  for (const pr of projects) {
    await pool.query(
      `INSERT INTO projects (title, summary, tech, sort_order) VALUES ($1, $2, $3, $4)`,
      [pr.title, pr.summary, pr.tech, pr.sort_order],
    );
  }

  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM posts)::int AS posts,
            (SELECT count(*) FROM comments)::int AS comments,
            (SELECT count(*) FROM projects)::int AS projects`,
  );
  console.log('seeded:', rows[0]);
  await pool.end();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
