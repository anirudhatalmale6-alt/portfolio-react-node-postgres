/**
 * End-to-end smoke test against a running server.
 *   BASE=http://127.0.0.1:4000 node test/smoke.mjs
 *
 * It checks the things that are easy to get quietly wrong: that an unmoderated
 * comment does NOT appear publicly, that admin routes really are closed without a
 * session, and that publishing stamps a date the site can show.
 */
const BASE = process.env.BASE || 'http://127.0.0.1:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@demo.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'demo-password-123';

let pass = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

let cookie = '';

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

const stamp = Date.now();

/* ------------------------------------------------------------ public API --- */

const health = await call('/api/health');
check('health returns this service', health.status === 200 && health.body.service === 'portfolio-api', JSON.stringify(health.body));

const list = await call('/api/posts');
check('published posts are listed', list.status === 200 && Array.isArray(list.body.posts) && list.body.posts.length > 0);

const first = list.body.posts[0];
check('list posts carry a publish date', Boolean(first?.published_at));
check('list posts do not leak the raw body', !('body_md' in (first || {})));

const detail = await call(`/api/posts/${first.slug}`);
check('post detail renders markdown to html', detail.status === 200 && detail.body.post.body_html.includes('<'));
check('post detail hides the markdown source', !('body_md' in detail.body.post));
check('post detail returns only approved comments', detail.body.comments.every((c) => c.body && !('status' in c)));

const missing = await call('/api/posts/no-such-post-anywhere');
check('unknown slug is a 404, not a 500', missing.status === 404);

/* ----------------------------------------------------- comment moderation --- */

const commentBody = `smoke test comment ${stamp}`;
const posted = await call(`/api/posts/${first.slug}/comments`, {
  method: 'POST',
  body: JSON.stringify({ author_name: 'Smoke Tester', author_email: 'smoke@example.com', body: commentBody }),
});
check('a visitor can post a comment', posted.status === 201, JSON.stringify(posted.body));

const afterPost = await call(`/api/posts/${first.slug}`);
check(
  'an unmoderated comment is NOT publicly visible',
  !afterPost.body.comments.some((c) => c.body === commentBody),
);

const xss = await call(`/api/posts/${first.slug}/comments`, {
  method: 'POST',
  body: JSON.stringify({ author_name: 'Injector', body: `<script>alert(1)</script>hello ${stamp}` }),
});
check('a script tag in a comment is accepted but stripped', xss.status === 201);

const empty = await call(`/api/posts/${first.slug}/comments`, {
  method: 'POST',
  body: JSON.stringify({ author_name: 'x', body: '' }),
});
check('an empty comment is rejected', empty.status === 400);

/* ------------------------------------------------------------- admin API --- */

const closed = await call('/api/admin/posts');
check('admin posts are closed without a session', closed.status === 401);
const closedComments = await call('/api/admin/comments');
check('admin comments are closed without a session', closedComments.status === 401);

const badLogin = await call('/api/admin/login', {
  method: 'POST',
  body: JSON.stringify({ email: ADMIN_EMAIL, password: 'definitely-not-the-password' }),
});
check('a wrong password is rejected', badLogin.status === 401);
check('the failure message does not reveal whether the account exists', /incorrect/i.test(badLogin.body.error || ''));

const unknownUser = await call('/api/admin/login', {
  method: 'POST',
  body: JSON.stringify({ email: `nobody-${stamp}@example.com`, password: 'whatever-password' }),
});
check('an unknown account gets the same message', unknownUser.body.error === badLogin.body.error);

const login = await call('/api/admin/login', {
  method: 'POST',
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
});
check('the real password signs in', login.status === 200, JSON.stringify(login.body));

const me = await call('/api/admin/me');
check('the session cookie is accepted', me.status === 200 && me.body.admin.email === ADMIN_EMAIL);

const pending = await call('/api/admin/comments?status=pending');
const mine = pending.body.comments.find((c) => c.body === commentBody);
check('the new comment is waiting for review', Boolean(mine));

const injected = pending.body.comments.find((c) => c.body.includes(`hello ${stamp}`));
check('the stored comment has no script tag left in it', injected && !/<script/i.test(injected.body), injected?.body);

await call(`/api/admin/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
const afterApprove = await call(`/api/posts/${first.slug}`);
check('an approved comment appears publicly', afterApprove.body.comments.some((c) => c.body === commentBody));

await call(`/api/admin/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'spam' }) });
const afterSpam = await call(`/api/posts/${first.slug}`);
check('a comment marked spam disappears again', !afterSpam.body.comments.some((c) => c.body === commentBody));
await call(`/api/admin/comments/${mine.id}`, { method: 'DELETE' });

/* -------------------------------------------------------- post lifecycle --- */

const draft = await call('/api/admin/posts', {
  method: 'POST',
  body: JSON.stringify({ title: `Smoke draft ${stamp}`, body_md: '# Draft\n\nbody', status: 'draft' }),
});
check('a draft is created', draft.status === 201, JSON.stringify(draft.body));
check('a draft has no publish date', draft.body.post.published_at === null);
check('a slug is generated from the title', /^smoke-draft-/.test(draft.body.post.slug));

const draftPublic = await call(`/api/posts/${draft.body.post.slug}`);
check('a draft is NOT readable publicly', draftPublic.status === 404);

const dup = await call('/api/admin/posts', {
  method: 'POST',
  body: JSON.stringify({ title: `Smoke draft ${stamp}`, status: 'draft' }),
});
check('a duplicate title gets a distinct slug', dup.body.post.slug !== draft.body.post.slug, dup.body.post?.slug);

const published = await call(`/api/admin/posts/${draft.body.post.id}`, {
  method: 'PUT',
  body: JSON.stringify({ title: `Smoke draft ${stamp}`, status: 'published' }),
});
check('publishing stamps a date', Boolean(published.body.post.published_at));
const stampedAt = new Date(published.body.post.published_at).getTime();
check(
  'the stamped date is now, not the creation date or a literal',
  Math.abs(stampedAt - Date.now()) < 120000,
  published.body.post.published_at,
);

const nowPublic = await call(`/api/posts/${published.body.post.slug}`);
check('the published post is readable publicly', nowPublic.status === 200);

const future = await call(`/api/admin/posts/${draft.body.post.id}`, {
  method: 'PUT',
  body: JSON.stringify({
    title: `Smoke draft ${stamp}`,
    status: 'published',
    published_at: new Date(Date.now() + 86400000).toISOString(),
  }),
});
check('a future publish date is accepted', future.status === 200);
const scheduled = await call(`/api/posts/${published.body.post.slug}`);
check('a post dated in the future is not live yet', scheduled.status === 404);

await call(`/api/admin/posts/${draft.body.post.id}`, { method: 'DELETE' });
await call(`/api/admin/posts/${dup.body.post.id}`, { method: 'DELETE' });
const goneList = await call('/api/admin/posts');
check('deleted posts are gone', !goneList.body.posts.some((p) => p.id === draft.body.post.id));

/* -------------------------------------------------------------- contact --- */

const contact = await call('/api/contact', {
  method: 'POST',
  body: JSON.stringify({ name: 'Smoke', email: 'smoke@example.com', body: `contact ${stamp}` }),
});
check('the contact form accepts a message', contact.status === 201);

const badContact = await call('/api/contact', {
  method: 'POST',
  body: JSON.stringify({ name: 'Smoke', email: 'not-an-email', body: 'hello there' }),
});
check('a malformed email is rejected', badContact.status === 400);

const inbox = await call('/api/admin/messages');
check('the message reaches the admin inbox', inbox.body.messages.some((m) => m.body === `contact ${stamp}`));

/* --------------------------------------------------------------- logout --- */

await call('/api/admin/logout', { method: 'POST' });
cookie = '';
const afterLogout = await call('/api/admin/me');
check('signing out closes the session', afterLogout.status === 401);

/* ---------------------------------------------------------------- SPA ---- */

const spa = await fetch(`${BASE}/blog/anything`);
const spaText = await spa.text();
check('unknown front-end routes serve the app shell', spa.status === 200 && spaText.includes('<div id="root">'));

const apiMiss = await call('/api/definitely-not-a-route');
check('unknown API routes still 404 as JSON', apiMiss.status === 404 && Boolean(apiMiss.body.error));

// A same-origin request carrying an Origin header (which Chrome sends for the Vite
// bundles, because they are marked `crossorigin`) must not be treated as foreign.
const sameOrigin = await fetch(`${BASE}/api/health`, { headers: { Origin: BASE } });
check('a same-origin request with an Origin header is served', sameOrigin.status === 200);
check(
  'a same-origin request is allowed by CORS',
  sameOrigin.headers.get('access-control-allow-origin') === BASE,
  String(sameOrigin.headers.get('access-control-allow-origin')),
);

const foreign = await fetch(`${BASE}/api/health`, { headers: { Origin: 'http://evil.example' } });
check(
  'a foreign origin gets no CORS header (so the browser blocks it)',
  !foreign.headers.get('access-control-allow-origin'),
  String(foreign.headers.get('access-control-allow-origin')),
);

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
