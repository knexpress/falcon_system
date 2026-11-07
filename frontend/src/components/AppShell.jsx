import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { clearAuth, getAuth } from './RequireAuth.jsx';

const nav = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/invoices', label: 'Invoices' },
  { to: '/app/vehicles', label: 'Vehicles' },
  { to: '/app/inventory', label: 'Inventory' },
  { to: '/app/customers', label: 'Customers' },
  { to: '/app/sales', label: 'Sales' },
  { to: '/app/expenses', label: 'Expenses' },
  { to: '/app/journal', label: 'Journal' },
];

const SIDEBAR_KEY = 'falcon_sidebar_open';

export default function AppShell() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    return saved === null ? true : saved === '1';
  });
  const [pendingDays, setPendingDays] = useState(0);
  const [showBackupNotice, setShowBackupNotice] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  useEffect(() => {
    let cancelled = false;

    function refreshBackupNotice() {
      api
        .getBackupStatus()
        .then((status) => {
          if (cancelled) return;
          const days = Number(status.pending_days) || 0;
          setPendingDays(days);
          if (days <= 0) {
            sessionStorage.removeItem('falcon_backup_notice_dismissed');
            setShowBackupNotice(false);
            return;
          }
          const dismissed = sessionStorage.getItem(
            'falcon_backup_notice_dismissed'
          );
          setShowBackupNotice(!dismissed);
        })
        .catch(() => {
          if (!cancelled) setShowBackupNotice(false);
        });
    }

    refreshBackupNotice();
    window.addEventListener('falcon-backup-done', refreshBackupNotice);
    return () => {
      cancelled = true;
      window.removeEventListener('falcon-backup-done', refreshBackupNotice);
    };
  }, []);

  function dismissBackupNotice() {
    sessionStorage.setItem('falcon_backup_notice_dismissed', '1');
    setShowBackupNotice(false);
  }

  function logout() {
    clearAuth();
    sessionStorage.removeItem('falcon_backup_notice_dismissed');
    navigate('/login');
  }

  return (
    <div className={`app-shell${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
      {sidebarOpen ? (
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand">
              <span className="brand-mark">FR</span>
              <div>
                <p className="brand-name">Falcon Revive</p>
                <p className="brand-sub">Denting &amp; Painting ERP</p>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              title="Close menu"
            >
              ×
            </button>
          </div>
          <nav className="side-nav">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-foot">
            <p style={{ margin: '0 0 8px' }}>{auth?.name || 'Staff'}</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: '#ddd', borderColor: '#444' }}
              onClick={logout}
            >
              Log out
            </button>
            <p style={{ marginTop: 14 }}>Workshop control desk</p>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          className="sidebar-open"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          title="Open menu"
        >
          ☰ Menu
        </button>
      )}
      <main className="main">
        {showBackupNotice && (
          <div className="backup-login-notice">
            <div>
              Backup pending for{' '}
              <strong>
                {pendingDays} day{pendingDays === 1 ? '' : 's'}
              </strong>
              . Daily backup at 12:00 AM is important — download it from Invoices
              when ready.
            </div>
            <div className="row-actions">
              <Link className="btn btn-primary btn-sm" to="/app/invoices">
                Go to Invoices
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={dismissBackupNotice}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
