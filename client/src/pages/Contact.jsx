import { useState } from 'react';
import { api } from '../lib/api.js';
import { ErrorNote } from '../components/Bits.jsx';
import { site } from '../site.config.js';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', body: '', website: '' });
  const [state, setState] = useState({ sending: false, error: null, done: null });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, error: null, done: null });
    try {
      const res = await api.post('/contact', form);
      setForm({ name: '', email: '', body: '', website: '' });
      setState({ sending: false, error: null, done: res.message });
    } catch (err) {
      setState({ sending: false, error: err, done: null });
    }
  }

  return (
    <div className="page prose">
      <h1>Get in touch</h1>
      <p className="lead" style={{ color: 'var(--text-muted)' }}>
        Send a message and it lands in my admin inbox. Based in {site.location}.
      </p>

      {state.done && (
        <div className="notice notice-ok" role="status">
          {state.done}
        </div>
      )}
      <ErrorNote error={state.error} />

      <form onSubmit={submit} noValidate>
        <div className="field-row">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" type="text" value={form.name} onChange={set('name')} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={set('email')} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="body">Message</label>
          <textarea id="body" value={form.body} onChange={set('body')} required />
        </div>
        <div className="hp" aria-hidden="true">
          <label htmlFor="website">Leave this empty</label>
          <input id="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={state.sending}>
          {state.sending ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  );
}
