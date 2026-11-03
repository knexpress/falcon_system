import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceForm from './pages/InvoiceForm.jsx';
import InvoiceDetail from './pages/InvoiceDetail.jsx';
import Customers from './pages/Customers.jsx';
import Sales from './pages/Sales.jsx';
import Expenses from './pages/Expenses.jsx';

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/invoices', label: 'Invoices' },
  { to: '/customers', label: 'Customers' },
  { to: '/sales', label: 'Sales' },
  { to: '/expenses', label: 'Expenses' },
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">FG</span>
          <div>
            <p className="brand-name">Falcon Garage</p>
            <p className="brand-sub">Finance Desk</p>
          </div>
        </div>
        <nav className="side-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-foot">Workshop invoicing &amp; books</p>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<InvoiceForm />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/expenses" element={<Expenses />} />
        </Routes>
      </main>
    </div>
  );
}
