import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi.js';
import { api } from '../lib/api.js';
import { formatDate, relativeTime } from '../lib/date.js';
import { Loading, ErrorNote, Avatar } from '../components/Bits.jsx';

function CommentForm({ slug }) {
  const [form, setForm] = useState({ author_name: '', author_email: '', body: '', website: '' });
  const [state, setState] = useState({ sending: false, error: null, done: null });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, error: null, done: null });
    try {
      const res = await api.post(`/posts/${encodeURIComponent(slug)}/comments`, form);
      setForm({ author_name: '', author_email: '', body: '', website: '' });
      setState({ sending: false, error: null, done: res.message });
    } catch (err) {
      setState({ sending: false, error: err, done: null });
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: '2rem' }} noValidate>
      <h3 style={{ fontSize: '1.05rem' }}>Leave a comment</h3>
      {state.done && (
        <div className="notice notice-ok" role="status">
          {state.done}
        </div>
      )}
      <ErrorNote error={state.error} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="c-name">Name</label>
          <input id="c-name" type="text" value={form.author_name} onChange={set('author_name')} required />
        </div>
        <div className="field">
          <label htmlFor="c-email">Email (optional, never published)</label>
          <input id="c-email" type="email" value={form.author_email} onChange={set('author_email')} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="c-body">Comment</label>
        <textarea id="c-body" value={form.body} onChange={set('body')} required />
      </div>

      {/* Honeypot - hidden from people, irresistible to bots. Not `required`, so it can
          never block a real submit. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="c-website">Leave this empty</label>
        <input id="c-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      <button className="btn btn-primary" type="submit" disabled={state.sending}>
        {state.sending ? 'Sending…' : 'Post comment'}
      </button>
      <p className="hint" style={{ marginTop: '0.6rem' }}>
        Comments are read before they appear, so yours will not show up straight away.
      </p>
    </form>
  );
}

export default function Post() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useApi(`/posts/${encodeURIComponent(slug)}`, [slug]);

  useEffect(() => {
    if (data?.post?.title) document.title = data.post.title;
    return () => {
      document.title = 'Portfolio';
    };
  }, [data]);

  if (loading) {
    return (
      <div className="page prose">
        <Loading lines={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page prose">
        <ErrorNote error={error} onRetry={reload} />
        <Link className="btn" to="/blog">
          ← Back to the blog
        </Link>
      </div>
    );
  }

  const { post, comments } = data;

  return (
    <div className="page">
      <article>
        <header style={{ maxWidth: 'var(--measure)', marginBottom: '2rem' }}>
          <Link to="/blog" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            ← Blog
          </Link>
          <h1 style={{ marginTop: '0.75rem' }}>{post.title}</h1>
          <div className="post-meta">
            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            {post.tags?.length > 0 && <span className="dot">{post.tags.join(', ')}</span>}
          </div>
        </header>

        {post.cover_image && <img src={post.cover_image} alt="" style={{ borderRadius: 'var(--radius)' }} />}

        {/* Sanitised server-side by sanitize-html before it ever reaches the browser. */}
        <div className="post-body" dangerouslySetInnerHTML={{ __html: post.body_html }} />
      </article>

      <section className="comments">
        <h2 style={{ fontSize: '1.2rem' }}>
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </h2>

        {comments.map((c) => (
          <div className="comment" key={c.id}>
            <div className="comment-head">
              <Avatar name={c.author_name} />
              <span className="comment-author">{c.author_name}</span>
              <span className="comment-when" title={formatDate(c.created_at)}>
                {relativeTime(c.created_at)}
              </span>
            </div>
            <p className="comment-body">{c.body}</p>
          </div>
        ))}

        <CommentForm slug={slug} />
      </section>
    </div>
  );
}
