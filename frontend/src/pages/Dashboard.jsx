import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className="error-banner">{error}. Is the backend running?</div>;
  }

  if (!data) {
    return <p className="muted">Loading dashboard…</p>;
  }

  const maxExpense = Math.max(
    ...data.expenses_by_category.map((c) => c.total),
    1
  );

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Workshop cashflow, invoices, and books at a glance.</p>
        </div>
        <Link className="btn btn-primary" to="/invoices/new">
          New invoice
        </Link>
      </header>

      <div className="stats-grid">
        <div className="stat-card accent">
          <p className="stat-label">Month sales</p>
          <p className="stat-value">{formatMoney(data.month_sales)}</p>
        </div>
        <div className="stat-card warn">
          <p className="stat-label">Month expenses</p>
          <p className="stat-value">{formatMoney(data.month_expenses)}</p>
        </div>
        <div className="stat-card ok">
          <p className="stat-label">Month profit</p>
          <p className="stat-value">{formatMoney(data.month_profit)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Outstanding</p>
          <p className="stat-value">{formatMoney(data.outstanding_amount)}</p>
        </div>
      </div>

      <div className="grid-2">
        <section className="panel">
          <h2 className="section-title" style={{ fontSize: '1.7rem' }}>
            Recent invoices
          </h2>
          {data.recent_invoices.length === 0 ? (
            <p className="empty">No invoices yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/invoices/${inv.id}`}>{inv.invoice_number}</Link>
                    </td>
                    <td>{inv.customer_name}</td>
                    <td>{formatDate(inv.issue_date)}</td>
                    <td>
                      <span className={`badge ${inv.status}`}>{inv.status}</span>
                    </td>
                    <td>{formatMoney(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h2 className="section-title" style={{ fontSize: '1.7rem' }}>
            Expense mix
          </h2>
          {data.expenses_by_category.length === 0 ? (
            <p className="empty">No expenses recorded.</p>
          ) : (
            <div className="bar-list">
              {data.expenses_by_category.map((row) => (
                <div className="bar-row" key={row.category}>
                  <span style={{ textTransform: 'capitalize' }}>{row.category}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(row.total / maxExpense) * 100}%` }}
                    />
                  </div>
                  <strong>{formatMoney(row.total)}</strong>
                </div>
              ))}
            </div>
          )}

          <h2
            className="section-title"
            style={{ fontSize: '1.7rem', marginTop: 24 }}
          >
            Recent expenses
          </h2>
          <div className="stack-list">
            {data.recent_expenses.map((exp) => (
              <div className="stack-item" key={exp.id}>
                <div>
                  <strong>{exp.description}</strong>
                  <p className="muted">
                    {formatDate(exp.expense_date)} · {exp.category}
                  </p>
                </div>
                <strong>{formatMoney(exp.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <p className="stat-label">All-time sales</p>
            <p className="stat-value">{formatMoney(data.sales_total)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">All-time expenses</p>
            <p className="stat-value">{formatMoney(data.expenses_total)}</p>
          </div>
          <div className="stat-card ok">
            <p className="stat-label">Net profit</p>
            <p className="stat-value">{formatMoney(data.profit)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Invoices</p>
            <p className="stat-value">{data.total_invoices}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
