import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import BrandLogo from '../components/BrandLogo.jsx';
import { setAuth } from '../components/RequireAuth.jsx';
import { SITE_IMAGES } from '../data/siteImages.js';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await api.login({
        username: username.trim(),
        password,
      });
      setAuth(user);
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-visual">
        <img src={SITE_IMAGES.hero.src} alt={SITE_IMAGES.hero.alt} />
        <div className="login-visual-copy">
          <BrandLogo className="login-mark" />
          <h1>Falcon Revive Ops</h1>
          <p>Denting &amp; painting workshop control — jobs, vehicles, stock, income.</p>
        </div>
      </aside>

      <main className="login-panel">
        <Link className="login-back" to="/">
          ← Back to website
        </Link>
        <h2>Staff login</h2>
        <p className="login-sub">Sign in to the garage ERP desk.</p>

        <div className="login-stack">
          <form onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin@falconrevive.ae"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button disabled={loading}>
              {loading ? 'Signing in…' : 'Enter ERP'}
            </button>
          </form>

          <div className="login-legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
