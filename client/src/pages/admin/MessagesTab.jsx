import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatDateTime } from '../../lib/date.js';
import { ErrorNote, Loading, Empty } from '../../components/Bits.jsx';

export default function MessagesTab() {
  const [state, setState] = useState({ messages: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get('/admin/messages');
      setState({ messages: res.messages, loading: false, error: null });
    } catch (err) {
      setState({ messages: [], loading: false, error: err });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(msg) {
    try {
      await api.patch(`/admin/messages/${msg.id}`, { handled: !msg.handled });
      await load();
    } catch (err) {
      setState((s) => ({ ...s, error: err }));
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.2rem' }}>Contact messages</h2>
      {state.loading && <Loading />}
      <ErrorNote error={state.error} onRetry={load} />
      {!state.loading && state.messages.length === 0 && <Empty>No messages yet.</Empty>}

      <div className="stack">
        {state.messages.map((m) => (
          <article className="card" key={m.id} style={{ opacity: m.handled ? 0.6 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <strong>{m.name}</strong>
                <div className="hint">
                  {m.email} · {formatDateTime(m.created_at)}
                </div>
              </div>
              {m.handled && <span className="badge">replied</span>}
            </div>
            <p className="comment-body" style={{ margin: '0.75rem 0' }}>
              {m.body}
            </p>
            <button type="button" className="btn btn-sm" onClick={() => toggle(m)}>
              {m.handled ? 'Mark unread' : 'Mark as replied'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
