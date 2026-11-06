import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SITE_IMAGES } from '../data/siteImages.js';
import './Login.css';

const DEMO_USER = {
  email: 'admin@falconrevive.ae',
  password: 'Falcon@123',
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(DEMO_USER.password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    window.setTimeout(() => {
      if (
        email.trim().toLowerCase() === DEMO_USER.email &&
        password === DEMO_USER.password
      ) {
        localStorage.setItem(
          'falcon_auth',
          JSON.stringify({
            email: DEMO_USER.email,
            name: 'Workshop Admin',
            role: 'owner',
            at: Date.now(),
          })
        );
        navigate('/app');
      } else {
        setError('Invalid email or password.');
        setLoading(false);
      }
    }, 450);
  }

  return (
    <div className="login-page">
      <aside className="login-visual">
        <img src={SITE_IMAGES.hero.src} alt={SITE_IMAGES.hero.alt} />
        <div className="login-visual-copy">
          <span className="login-mark">FR</span>
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

        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
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

        <p className="login-hint">
          Demo: <code>{DEMO_USER.email}</code> / <code>{DEMO_USER.password}</code>
        </p>
      </main>
    </div>
  );
}
