import { useEffect, useState } from 'react';
import { Lottie } from 'lottie-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { clearAuth, getAuth } from './RequireAuth.jsx';
import { isStaffRole, navAllows } from '../roles.js';
import BrandLogo from './BrandLogo.jsx';
import ProfileMenu from './ProfileMenu.jsx';

const nav = [
  {
    to: '/app',
    label: 'Dashboard',
    end: true,
    roles: ['owner', 'staff'],
    icon: 'home',
  },
  {
    to: '/app/quotations',
    label: 'Quotations',
    roles: ['owner', 'staff', 'superadmin'],
    icon: 'quote',
  },
  {
    to: '/app/invoices',
    label: 'Invoices',
    roles: ['owner', 'staff', 'superadmin'],
    icon: 'invoice',
  },
  {
    to: '/app/vehicles',
    label: 'Vehicles',
    roles: ['owner', 'staff'],
    icon: 'car',
  },
  {
    to: '/app/inventory',
    label: 'Inventory',
    roles: ['owner', 'staff'],
    icon: 'box',
  },
  {
    to: '/app/customers',
    label: 'Customers',
    roles: ['owner', 'staff'],
    icon: 'users',
  },
  {
    to: '/app/sales',
    label: 'Sales',
    roles: ['staff'],
    icon: 'sales',
  },
  {
    to: '/app/expenses',
    label: 'Expenses',
    roles: ['staff'],
    icon: 'expense',
  },
  {
    to: '/app/journal',
    label: 'Journal',
    roles: ['staff'],
    icon: 'journal',
  },
];

const SIDEBAR_KEY = 'falcon_sidebar_open';

function NavIcon({ name }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </svg>
      );
    case 'quote':
      return (
        <svg {...common}>
          <path d="M8 8h5v5H9.5A3.5 3.5 0 0 1 6 9.5V8h2zm8 0h5v5h-3.5A3.5 3.5 0 0 1 14 9.5V8h2z" />
        </svg>
      );
    case 'invoice':
      return (
        <svg {...common}>
          <path d="M7 3.5h7.5L19 8v12.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
          <path d="M14 3.5V8h4.5M8.5 12h7M8.5 15.5h5" />
        </svg>
      );
    case 'car':
      return (
        <svg {...common}>
          <path d="M4 14.5 6.5 9h11l2.5 5.5" />
          <path d="M4 14.5h16v3.5H4z" />
          <circle cx="7.5" cy="18" r="1.4" />
          <circle cx="16.5" cy="18" r="1.4" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path d="m4 8 8-4 8 4-8 4-8-4z" />
          <path d="M4 8v8l8 4 8-4V8M12 12v8" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="3" />
          <path d="M3.5 18a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="9.5" r="2.4" />
          <path d="M15 18c.4-2.2 2-3.7 4.5-3.7" />
        </svg>
      );
    case 'sales':
      return (
        <svg {...common}>
          <path d="M4 17 10 11l4 4 6-8" />
          <path d="M15 7h5v5" />
        </svg>
      );
    case 'expense':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M9.5 10.5c.6-1 1.6-1.5 2.5-1.5s2 .6 2 1.7c0 2.3-4.5 1.4-4.5 3.8 0 1 .9 1.7 2.2 1.7 1 0 1.9-.5 2.4-1.3" />
        </svg>
      );
    case 'journal':
      return (
        <svg {...common}>
          <path d="M7 4h11v16H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
          <path d="M9.5 8.5h6M9.5 12h6M9.5 15.5h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
  }
}

function pageTitle(pathname) {
  if (pathname === '/app' || pathname === '/app/') return 'Dashboard';
  const hit = nav.find(
    (item) =>
      item.to !== '/app' &&
      (pathname === item.to || pathname.startsWith(`${item.to}/`))
  );
  return hit?.label || 'Workspace';
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const role = auth?.role || 'staff';
  const visibleNav = nav.filter((item) => navAllows(item.roles, role));
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
    <div className={`app-shell glass-shell${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
      {sidebarOpen ? (
        <aside className="icon-rail" aria-label="Main navigation">
          <Link to="/app" className="rail-brand" title="Falcon Revive">
            <BrandLogo className="rail-brand-logo" decorative />
          </Link>
          <nav className="rail-nav">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? 'rail-link active' : 'rail-link'
                }
                title={item.label}
                aria-label={item.label}
              >
                <NavIcon name={item.icon} />
              </NavLink>
            ))}
          </nav>
          <div className="rail-foot">
            <button
              type="button"
              className="rail-link"
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse menu"
              title="Collapse menu"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M15 6 9 12l6 6" />
              </svg>
            </button>
          </div>
        </aside>
      ) : null}

      <div className="workspace">
        <div className="workspace-lottie" aria-hidden="true">
          <Lottie
            src="/falcon.json"
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <header className="workspace-chrome">
          <div className="workspace-chrome-left">
            {!sidebarOpen && (
              <button
                type="button"
                className="rail-link chrome-open"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                title="Open menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            )}
            <nav className="top-pill-nav" aria-label="Sections">
              {visibleNav.map((item) => (
                <NavLink
                  key={`pill-${item.to}`}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'top-pill active' : 'top-pill'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="workspace-tools">
            <ProfileMenu onLogout={logout} />
          </div>
        </header>

        <main className="main workspace-main">
          {showBackupNotice && (
            <div className="backup-login-notice glass-notice">
              <div>
                Backup pending for{' '}
                <strong>
                  {pendingDays} day{pendingDays === 1 ? '' : 's'}
                </strong>
                . Daily backup at 12:00 AM is important — download it from
                Invoices when ready.
              </div>
              <div className="row-actions">
                {isStaffRole(role) && (
                  <Link className="btn btn-primary btn-sm" to="/app/invoices">
                    Go to Invoices
                  </Link>
                )}
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
          <Outlet context={{ pageTitle: pageTitle(location.pathname) }} />
        </main>
      </div>
    </div>
  );
}
