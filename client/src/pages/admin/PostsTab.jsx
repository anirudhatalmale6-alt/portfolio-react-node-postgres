import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api.js';
import { formatDateTime, toLocalInputValue } from '../../lib/date.js';
import { ErrorNote, Loading, Empty } from '../../components/Bits.jsx';

const BLANK = {
  title: '',
  slug: '',
  excerpt: '',
  body_md: '',
  cover_image: '',
  tags: [],
  status: 'draft',
  published_at: null,
};

function Editor({ post, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({ ...BLANK, ...(post || {}), tags: post?.tags || [] }));
  const [tagText, setTagText] = useState((post?.tags || []).join(', '));
  const [state, setState] = useState({ saving: false, error: null, saved: null });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setState({ saving: true, error: null, saved: null });
    const payload = {
      title: form.title,
      slug: form.slug || '',
      excerpt: form.excerpt || '',
      body_md: form.body_md || '',
      cover_image: form.cover_image || '',
      tags: tagText.split(',').map((t) => t.trim()).filter(Boolean),
      status: form.status,
    };
    // Only send a date when the author actually picked one; otherwise let the server
    // stamp publish time, so a draft written last week does not go live back-dated.
    if (form.published_at) payload.published_at = new Date(form.published_at).toISOString();

    try {
      const res = post?.id ? await api.put(`/admin/posts/${post.id}`, payload) : await api.post('/admin/posts', payload);
      setState({ saving: false, error: null, saved: 'Saved' });
      onSaved(res.post);
    } catch (err) {
      setState({ saving: false, error: err, saved: null });
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{post?.id ? 'Edit post' : 'New post'}</h2>
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
            Back to list
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={state.saving}>
            {state.saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {state.saved && (
        <div className="notice notice-ok" role="status">
          {state.saved}
        </div>
      )}
      <ErrorNote error={state.error} />

      <div className="editor-grid">
        <div className="editor-body">
          <div className="field">
            <label htmlFor="p-title">Title</label>
            <input id="p-title" type="text" value={form.title} onChange={set('title')} required />
          </div>
          <div className="field">
            <label htmlFor="p-excerpt">Excerpt — the line that shows on the blog list</label>
            <input id="p-excerpt" type="text" value={form.excerpt || ''} onChange={set('excerpt')} maxLength={500} />
          </div>
          <div className="field">
            <label htmlFor="p-body">Body (Markdown)</label>
            <textarea id="p-body" value={form.body_md || ''} onChange={set('body_md')} />
          </div>
        </div>

        <aside className="stack">
          <div className="card">
            <div className="field">
              <label htmlFor="p-status">Status</label>
              <select id="p-status" value={form.status} onChange={set('status')}>
                <option value="draft">Draft — only you can see it</option>
                <option value="published">Published — live on the site</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="p-date">Publish date</label>
              <input
                id="p-date"
                type="datetime-local"
                value={toLocalInputValue(form.published_at)}
                onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value || null }))}
              />
              <p className="hint">Leave empty to stamp it when you publish. A future date schedules the post.</p>
            </div>
            <div className="field">
              <label htmlFor="p-tags">Tags (comma separated)</label>
              <input id="p-tags" type="text" value={tagText} onChange={(e) => setTagText(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="p-slug">URL slug</label>
              <input id="p-slug" type="text" value={form.slug || ''} onChange={set('slug')} placeholder="auto from title" />
              <p className="hint">Changing this breaks any link already shared to the old address.</p>
            </div>
          </div>

          <div className="card">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="p-cover">Cover image URL</label>
              <input id="p-cover" type="text" value={form.cover_image || ''} onChange={set('cover_image')} />
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

export default function PostsTab() {
  const [state, setState] = useState({ posts: [], loading: true, error: null });
  const [editing, setEditing] = useState(null); // null = list, {} = new, {id} = edit

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get('/admin/posts');
      setState({ posts: res.posts, loading: false, error: null });
    } catch (err) {
      setState({ posts: [], loading: false, error: err });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openEditor(id) {
    if (!id) return setEditing({});
    try {
      const res = await api.get(`/admin/posts/${id}`);
      setEditing(res.post);
    } catch (err) {
      setState((s) => ({ ...s, error: err }));
    }
  }

  async function remove(post) {
    if (!window.confirm(`Delete “${post.title}”? Its comments go with it. This cannot be undone.`)) return;
    try {
      await api.del(`/admin/posts/${post.id}`);
      await load();
    } catch (err) {
      setState((s) => ({ ...s, error: err }));
    }
  }

  if (editing) {
    return (
      <Editor
        post={editing.id ? editing : null}
        onSaved={async () => {
          await load();
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}
      >
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Posts</h2>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => openEditor(null)}>
          New post
        </button>
      </div>

      {state.loading && <Loading />}
      <ErrorNote error={state.error} onRetry={load} />
      {!state.loading && state.posts.length === 0 && <Empty>No posts yet. Write the first one.</Empty>}

      {state.posts.length > 0 && (
        <div className="table-wrap card" style={{ padding: '0.25rem 0.5rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    <div className="hint">/blog/{p.slug}</div>
                    {p.pending_comments > 0 && (
                      <div className="hint">
                        {p.pending_comments} comment{p.pending_comments === 1 ? '' : 's'} waiting for review
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${p.status}`}>{p.status}</span>
                  </td>
                  <td className="hint">{p.published_at ? formatDateTime(p.published_at) : '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => openEditor(p.id)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(p)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
