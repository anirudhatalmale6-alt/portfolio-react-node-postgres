import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Home from './pages/Home.jsx';
import Blog from './pages/Blog.jsx';
import Post from './pages/Post.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';
import Admin from './pages/admin/Admin.jsx';
import { site } from './site.config.js';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Header() {
  return (
    <header className="site-header">
      <div className="page inner">
        <Link to="/" className="brand">
          <span className="mark" aria-hidden="true">
            {site.initials}
          </span>
          {site.name}
        </Link>
        <nav className="site-nav" aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  // Rendered at request time, so the year is never a stale literal.
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="page inner">
        <span>
          © {year} {site.name}
        </span>
        <span style={{ display: 'flex', gap: '1rem' }}>
          {site.links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer noopener">
              {l.label}
            </a>
          ))}
          <Link to="/admin">Admin</Link>
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="site">
      <ScrollToTop />
      {!isAdmin && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Post />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}
