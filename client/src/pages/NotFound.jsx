import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page prose">
      <h1>Page not found</h1>
      <p style={{ color: 'var(--text-muted)' }}>That link does not lead anywhere on this site.</p>
      <Link className="btn btn-primary" to="/">
        Back home
      </Link>
    </div>
  );
}
