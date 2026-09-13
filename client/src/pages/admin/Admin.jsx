import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { ErrorNote, Loading } from '../../components/Bits.jsx';
import PostsTab from './PostsTab.jsx';
import CommentsTab from './CommentsTab.jsx';
import MessagesTab from './MessagesTab.jsx';

function Login({ onSignedIn }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [state, setState] = useState({ sending: false, error: null });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, error: null });
    try {
      const res = await api.post('/admin/login', form);
      onSignedIn(res.admin);
    } catch (err) {
      setState({ sending: false, error: err });
    }
  }

  return (
    <div className="page">
      <div className="login-wrap card">
        <h1 style={{ fontSize: '1.4rem' }}>Sign in</h1>
        <ErrorNote error={state.error} />
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="a-email">Email</label>
            <input id="a-email" type="email" autoComplete="username" value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label htmlFor="a-pass">Password</label>
            <input
              id="a-pass"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={set('password')}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={state.sending} style={{ width: '100%' }}>
            {state.sending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="hint" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <Link to="/">← Back to the site</Link>
        </p>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'comments', label: 'Comments' },
  { key: 'messages', label: 'Messages' },
];

export default function Admin() {
  const [session, setSession] = useState({ admin: null, checking: true });
  const [tab, setTab] = useState('posts');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/admin/me')
      .then((res) => !cancelled && setSession({ admin: res.admin, checking: false }))
      // 401 here is the normal "not signed in yet" case, not an error to show.
      .catch(() => !cancelled && setSession({ admin: null, checking: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCounts = useCallback(() => {
    api
      .get('/admin/comments/counts')
      .then((res) => setPending(res.counts.pending))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session.admin) refreshCounts();
  }, [session.admin, refreshCounts]);

  async function signOut() {
    try {
      await api.post('/admin/logout');
    } finally {
      setSession({ admin: null, checking: false });
    }
  }

  if (session.checking) {
    return (
      <div className="page">
        <Loading />
      </div>
    );
  }

  if (!session.admin) {
    return <Login onSignedIn={(admin) => setSession({ admin, checking: false })} />;
  }

  return (
    <div className="page">
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.1rem' }}>Admin</h1>
          <p className="hint" style={{ margin: 0 }}>
            Signed in as {session.admin.email}
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn btn-sm btn-ghost" to="/">
            View site
          </Link>
          <button type="button" className="btn btn-sm" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="admin-shell">
        <nav className="admin-nav" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === 'comments' && pending > 0 && <span className="count-pill">{pending}</span>}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'posts' && <PostsTab />}
          {tab === 'comments' && <CommentsTab onChanged={refreshCounts} />}
          {tab === 'messages' && <MessagesTab />}
        </div>
      </div>
    </div>
  );
}
