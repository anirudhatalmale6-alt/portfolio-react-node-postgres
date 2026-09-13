import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { formatDate } from '../lib/date.js';
import { Loading, ErrorNote, Empty } from '../components/Bits.jsx';

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') || '';
  const { data, loading, error, reload } = useApi(`/posts${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`, [tag]);

  const allTags = [...new Set((data?.posts || []).flatMap((p) => p.tags || []))];

  return (
    <div className="page">
      <header className="hero" style={{ paddingBottom: '1.5rem' }}>
        <h1>Blog</h1>
        <p className="lead">Notes on what I am building and what broke along the way.</p>
      </header>

      {(allTags.length > 0 || tag) && (
        <div className="tags" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`tag ${tag ? '' : 'active'}`}
            style={{ cursor: 'pointer', font: 'inherit', fontSize: '0.76rem' }}
            onClick={() => setParams({})}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              className={`tag ${t === tag ? 'active' : ''}`}
              style={{ cursor: 'pointer', font: 'inherit', fontSize: '0.76rem' }}
              onClick={() => setParams({ tag: t })}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading && <Loading lines={6} />}
      <ErrorNote error={error} onRetry={reload} />
      {data && data.posts.length === 0 && (
        <Empty>{tag ? `No posts tagged “${tag}”.` : 'No posts published yet.'}</Empty>
      )}

      {data && data.posts.length > 0 && (
        <div className="post-list">
          {data.posts.map((post) => (
            <Link className="post-item" to={`/blog/${post.slug}`} key={post.id}>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <div className="post-meta">
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                <span className="dot">
                  {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
                </span>
                {post.tags?.length > 0 && <span className="dot">{post.tags.join(', ')}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
