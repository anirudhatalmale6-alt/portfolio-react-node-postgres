import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatDateTime } from '../../lib/date.js';
import { ErrorNote, Loading, Empty, Avatar } from '../../components/Bits.jsx';

const FILTERS = [
  { key: 'pending', label: 'Waiting for review' },
  { key: 'approved', label: 'Approved' },
  { key: 'spam', label: 'Spam' },
];

export default function CommentsTab({ onChanged }) {
  const [filter, setFilter] = useState('pending');
  const [state, setState] = useState({ comments: [], loading: true, error: null });

  const load = useCallback(async (status) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get(`/admin/comments?status=${status}`);
      setState({ comments: res.comments, loading: false, error: null });
    } catch (err) {
      setState({ comments: [], loading: false, error: err });
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function setStatus(comment, status) {
    try {
      await api.patch(`/admin/comments/${comment.id}`, { status });
      await load(filter);
      onChanged?.();
    } catch (err) {
      setState((s) => ({ ...s, error: err }));
    }
  }

  async function remove(comment) {
    if (!window.confirm('Delete this comment permanently?')) return;
    try {
      await api.del(`/admin/comments/${comment.id}`);
      await load(filter);
      onChanged?.();
    } catch (err) {
      setState((s) => ({ ...s, error: err }));
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.2rem' }}>Comments</h2>
      <div className="tags" style={{ marginBottom: '1.25rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`tag ${filter === f.key ? 'active' : ''}`}
            style={{ cursor: 'pointer', font: 'inherit', fontSize: '0.76rem' }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {state.loading && <Loading />}
      <ErrorNote error={state.error} onRetry={() => load(filter)} />
      {!state.loading && state.comments.length === 0 && (
        <Empty>
          {filter === 'pending' ? 'Nothing waiting for review.' : `No ${filter} comments.`}
        </Empty>
      )}

      <div className="stack">
        {state.comments.map((c) => (
          <article className="card" key={c.id}>
            <div className="comment-head">
              <Avatar name={c.author_name} />
              <div>
                <div className="comment-author">{c.author_name}</div>
                <div className="hint">
                  {c.author_email || 'no email'} · {formatDateTime(c.created_at)}
                </div>
              </div>
            </div>
            <p className="comment-body" style={{ margin: '0.75rem 0' }}>
              {c.body}
            </p>
            <div className="hint" style={{ marginBottom: '0.75rem' }}>
              on <a href={`/blog/${c.post_slug}`} target="_blank" rel="noreferrer noopener">{c.post_title}</a>
            </div>
            <div className="row-actions">
              {c.status !== 'approved' && (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setStatus(c, 'approved')}>
                  Approve
                </button>
              )}
              {c.status !== 'spam' && (
                <button type="button" className="btn btn-sm" onClick={() => setStatus(c, 'spam')}>
                  Mark spam
                </button>
              )}
              {c.status !== 'pending' && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStatus(c, 'pending')}>
                  Back to review
                </button>
              )}
              <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(c)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
