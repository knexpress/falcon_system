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
        <Link className="btn btn-primary" to="/app/invoices/new">
          New invoice
        </Link>
      </header>

      <div className="stats-grid">
        <div className="stat-card accent">
          <p className="stat-label">Month income</p>
          <p className="stat-value">{formatMoney(data.month_income ?? data.month_sales)}</p>
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

      <div className="stats-grid" style={{ marginTop: 0 }}>
        <div className="stat-card">
          <p className="stat-label">Income from paid invoices</p>
          <p className="stat-value">{formatMoney(data.invoice_income || 0)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Other / walk-in sales</p>
          <p className="stat-value">{formatMoney(data.other_sales || 0)}</p>
        </div>
        <div className="stat-card accent">
          <p className="stat-label">Total income</p>
          <p className="stat-value">
            {formatMoney(data.income_total ?? data.sales_total)}
          </p>
        </div>
        <div className="stat-card warn">
          <p className="stat-label">Paid invoices</p>
          <p className="stat-value">{data.paid_invoices || 0}</p>
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
                      <Link to={`/app/invoices/${inv.id}`}>{inv.invoice_number}</Link>
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

        <section className="panel expense-panel">
          <div className="expense-block">
            <div className="expense-block-head">
              <h2 className="section-title" style={{ fontSize: '1.45rem' }}>
                Expense mix
              </h2>
              <p className="muted expense-block-sub">By category</p>
            </div>
            {data.expenses_by_category.length === 0 ? (
              <p className="empty">No expenses recorded.</p>
            ) : (
              <div className="bar-list">
                {data.expenses_by_category.map((row) => (
                  <div className="bar-row" key={row.category}>
                    <div className="bar-meta">
                      <span className="bar-label">{row.category}</span>
                      <strong className="bar-amount">
                        {formatMoney(row.total)}
                      </strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(row.total / maxExpense) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="expense-divider" />

          <div className="expense-block">
            <div className="expense-block-head">
              <h2 className="section-title" style={{ fontSize: '1.45rem' }}>
                Recent expenses
              </h2>
              <p className="muted expense-block-sub">Latest entries</p>
            </div>
            {data.recent_expenses.length === 0 ? (
              <p className="empty">No recent expenses.</p>
            ) : (
              <div className="stack-list">
                {data.recent_expenses.map((exp) => (
                  <div className="stack-item expense-item" key={exp.id}>
                    <div className="expense-item-main">
                      <strong className="expense-item-title">
                        {exp.description}
                      </strong>
                      <div className="expense-item-meta">
                        <span>{formatDate(exp.expense_date)}</span>
                        <span className="expense-cat">{exp.category}</span>
                      </div>
                    </div>
                    <strong className="expense-item-amount">
                      {formatMoney(exp.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <p className="stat-label">All-time income</p>
            <p className="stat-value">
              {formatMoney(data.income_total ?? data.sales_total)}
            </p>
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

      <section className="panel" style={{ marginTop: 18 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <h2 className="section-title" style={{ fontSize: '1.7rem' }}>
              Inventory
            </h2>
            <p className="muted">
              {data.inventory_items || 0} items · stock value{' '}
              {formatMoney(data.stock_value || 0)}
            </p>
          </div>
          <Link className="btn btn-ghost btn-sm" to="/app/inventory">
            Open inventory
          </Link>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="stat-card accent">
            <p className="stat-label">Stock value</p>
            <p className="stat-value">{formatMoney(data.stock_value || 0)}</p>
          </div>
          <div className="stat-card warn">
            <p className="stat-label">Low stock alerts</p>
            <p className="stat-value">{data.low_stock_count || 0}</p>
          </div>
        </div>

        {(data.low_stock_items || []).length === 0 ? (
          <p className="empty">No low-stock items.</p>
        ) : (
          <div className="stack-list" style={{ marginTop: 12 }}>
            {data.low_stock_items.map((item) => (
              <div className="stack-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p className="muted">
                    {item.sku || 'No SKU'} · reorder at {item.reorder_level}{' '}
                    {item.unit}
                  </p>
                </div>
                <strong>
                  {item.quantity_on_hand} {item.unit}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
