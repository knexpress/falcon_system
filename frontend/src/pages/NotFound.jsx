import { Link, useLocation } from 'react-router-dom';
import { Lottie } from 'lottie-react';
import InteractiveBackdrop from '../components/InteractiveBackdrop.jsx';
import './NotFound.css';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="nf-page">
      <InteractiveBackdrop />
      <div className="nf-content">
        <p className="nf-code">404</p>
        <h1 className="nf-title">Route not found</h1>
        <p className="nf-copy">
          Nothing matches <code>{location.pathname}</code>. The car kept driving —
          this page did not.
        </p>

        <div className="nf-lottie">
          <Lottie
            src="/car-lottie.json"
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        <div className="nf-actions">
          <Link className="btn btn-primary" to="/">
            Back to website
          </Link>
          <Link className="btn btn-ghost nf-ghost" to="/app">
            Open ERP
          </Link>
          <Link className="btn btn-ghost nf-ghost" to="/login">
            Staff login
          </Link>
        </div>
      </div>
    </div>
  );
}
