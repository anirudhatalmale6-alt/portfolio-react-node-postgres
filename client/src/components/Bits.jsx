export function Loading({ lines = 3 }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="hp">Loading</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      {error.message || String(error)}
      {onRetry && (
        <>
          {' '}
          <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

export function Avatar({ name }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
  return (
    <span className="avatar" aria-hidden="true">
      {initials || '?'}
    </span>
  );
}
