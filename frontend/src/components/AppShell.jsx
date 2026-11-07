import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  function logout() {
    clearAuth();
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
        <Outlet />
      </main>
    </div>
  );
}
