import { Link } from 'react-router-dom';
import { site } from '../site.config.js';
import { useApi } from '../lib/useApi.js';
import { formatDate } from '../lib/date.js';
import { Loading, ErrorNote, Empty } from '../components/Bits.jsx';

function ProjectCard({ project }) {
  return (
    <article className="card">
      <h3 style={{ marginBottom: '0.4rem', fontSize: '1.1rem' }}>{project.title}</h3>
      <p style={{ color: 'var(--text-muted)' }}>{project.summary}</p>
      {project.tech?.length > 0 && (
        <div className="tags" style={{ marginBottom: '0.9rem' }}>
          {project.tech.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="row-actions">
        {project.live_url && (
          <a className="btn btn-sm" href={project.live_url} target="_blank" rel="noreferrer noopener">
            Live site
          </a>
        )}
        {project.repo_url && (
          <a className="btn btn-sm btn-ghost" href={project.repo_url} target="_blank" rel="noreferrer noopener">
            Code
          </a>
        )}
      </div>
    </article>
  );
}

export default function Home() {
  const projects = useApi('/projects', []);
  const posts = useApi('/posts?limit=3', []);

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">{site.role}</p>
        <h1>{site.tagline}</h1>
        <p className="lead">{site.intro}</p>
        <div className="actions">
          <Link className="btn btn-primary" to="/blog">
            Read the blog
          </Link>
          <Link className="btn" to="/contact">
            Get in touch
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>What I work with</h2>
        </div>
        <div className="tags">
          {site.skills.map((s) => (
            <span className="tag" key={s}>
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Selected work</h2>
        </div>
        {projects.loading && <Loading />}
        <ErrorNote error={projects.error} onRetry={projects.reload} />
        {projects.data && projects.data.projects.length === 0 && (
          <Empty>No projects yet - add them from the admin panel.</Empty>
        )}
        {projects.data && projects.data.projects.length > 0 && (
          <div className="card-grid">
            {projects.data.projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Latest writing</h2>
          <Link to="/blog">All posts →</Link>
        </div>
        {posts.loading && <Loading />}
        <ErrorNote error={posts.error} onRetry={posts.reload} />
        {posts.data && posts.data.posts.length === 0 && <Empty>No posts published yet.</Empty>}
        {posts.data && (
          <div className="post-list">
            {posts.data.posts.map((post) => (
              <Link className="post-item" to={`/blog/${post.slug}`} key={post.id}>
                <h3>{post.title}</h3>
                <p>{post.excerpt}</p>
                <div className="post-meta">
                  <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                  <span className="dot">
                    {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
