import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';
import { getAuth } from '../components/RequireAuth.jsx';

function initials(name) {
  return String(name || 'FR')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function avatarTone(seed) {
  const tones = [
    'linear-gradient(145deg,#8b7cf6,#6aa8f8)',
    'linear-gradient(145deg,#6ed3b2,#6aa8f8)',
    'linear-gradient(145deg,#f2b58a,#8b7cf6)',
    'linear-gradient(145deg,#6aa8f8,#49b894)',
  ];
  const n = String(seed || '')
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return tones[n % tones.length];
}

function EmptyHint({ title, body, actionTo, actionLabel }) {
  return (
    <div className="empty-hint">
      <strong>{title}</strong>
      <p>{body}</p>
      {actionTo && actionLabel ? (
        <Link className="btn btn-ghost btn-sm" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function PerformanceChart({ income, expenses, profit }) {
  const series = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weights = [0.1, 0.14, 0.16, 0.18, 0.15, 0.14, 0.13];
    const max = Math.max(income, expenses, Math.abs(profit), 1);
    const toCoords = (total) =>
      weights.map((w, i) => ({
        x: 36 + i * 54,
        y: 168 - (Math.max(total, 0) * w * 128) / max,
      }));
    const toPoints = (coords) => coords.map((p) => `${p.x},${p.y}`).join(' ');
    const incomePts = toCoords(income);
    const expensePts = toCoords(expenses);
    const profitPts = toCoords(Math.max(profit, 0));
    return {
      days,
      incomePts,
      expensePts,
      profitPts,
      income: toPoints(incomePts),
      expenses: toPoints(expensePts),
      profit: toPoints(profitPts),
    };
  }, [income, expenses, profit]);

  return (
    <div className="dash-chart">
      <div className="dash-chart-plot">
        <svg viewBox="0 0 400 190" role="img" aria-label="Month performance">
          {[36, 76, 116, 156].map((y) => (
            <line
              key={y}
              x1="24"
              x2="388"
              y1={y}
              y2={y}
              stroke="rgba(29,27,36,0.08)"
              strokeWidth="1"
            />
          ))}
          <polyline
            fill="none"
            stroke="#8b7cf6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={series.income}
          />
          <polyline
            fill="none"
            stroke="#6aa8f8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={series.expenses}
          />
          <polyline
            fill="none"
            stroke="#6ed3b2"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={series.profit}
          />
          {series.incomePts.map((p, i) => (
            <circle key={`i-${i}`} cx={p.x} cy={p.y} r="3.2" fill="#8b7cf6" />
          ))}
          {series.expensePts.map((p, i) => (
            <circle key={`e-${i}`} cx={p.x} cy={p.y} r="3.2" fill="#6aa8f8" />
          ))}
          {series.profitPts.map((p, i) => (
            <circle key={`p-${i}`} cx={p.x} cy={p.y} r="3.2" fill="#6ed3b2" />
          ))}
          {series.days.map((d, i) => (
            <text
              key={d}
              x={36 + i * 54}
              y="184"
              textAnchor="middle"
              fontSize="11"
              fill="#6f6a7c"
            >
              {d}
            </text>
          ))}
        </svg>
      </div>
      <div className="chart-metrics">
        <div className="chart-metric">
          <span className="chart-dot" style={{ background: '#8b7cf6' }} />
          <div>
            <small>Income</small>
            <strong>{formatMoney(income)}</strong>
          </div>
        </div>
        <div className="chart-metric">
          <span className="chart-dot" style={{ background: '#6aa8f8' }} />
          <div>
            <small>Expenses</small>
            <strong>{formatMoney(expenses)}</strong>
          </div>
        </div>
        <div className="chart-metric">
          <span className="chart-dot" style={{ background: '#6ed3b2' }} />
          <div>
            <small>Profit</small>
            <strong>{formatMoney(profit)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const auth = getAuth();
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

  const monthIncome = Number(data.month_income ?? data.month_sales) || 0;
  const monthExpenses = Number(data.month_expenses) || 0;
  const monthProfit = Number(data.month_profit) || 0;
  const outstanding = Number(data.outstanding_amount) || 0;
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
        <div className="row-actions">
          {auth?.role === 'owner' && (
            <Link className="btn btn-ghost" to="/app/approvals">
              Approvals
              {data.pending_approvals ? ` (${data.pending_approvals})` : ''}
            </Link>
          )}
          {auth?.role === 'staff' && (
            <Link className="btn btn-primary" to="/app/invoices/new">
              New invoice
            </Link>
          )}
        </div>
      </header>

      {auth?.role === 'owner' && Number(data.pending_approvals) > 0 && (
        <div className="backup-login-notice glass-notice" style={{ marginBottom: 16 }}>
          <div>
            <strong>{data.pending_approvals}</strong> quotation
            {data.pending_approvals === 1 ? '' : 's'} waiting for your approval.
          </div>
          <Link className="btn btn-primary btn-sm" to="/app/approvals">
            Review now
          </Link>
        </div>
      )}

      <div className="dash-mosaic">
        <div className="dash-stack">
          <div className="feature-card violet">
            <div>
              <h3>Month income</h3>
              <p>Paid invoices & walk-ins</p>
            </div>
            <div className="feature-value">{formatMoney(monthIncome)}</div>
          </div>
          <div className="feature-card blue">
            <div>
              <h3>Month expenses</h3>
              <p>Parts, vendors & overhead</p>
            </div>
            <div className="feature-value">{formatMoney(monthExpenses)}</div>
          </div>
          <div className="feature-card mint">
            <div>
              <h3>Month profit</h3>
              <p>Income minus expenses</p>
            </div>
            <div className="feature-value">{formatMoney(monthProfit)}</div>
          </div>
          <div className="feature-card peach">
            <div>
              <h3>Outstanding</h3>
              <p>Sent & overdue invoices</p>
            </div>
            <div className="feature-value">{formatMoney(outstanding)}</div>
          </div>
        </div>

        <div className="dash-stack">
          <section className="glass-panel performance-panel">
            <div className="panel-head">
              <div>
                <h2>Performance</h2>
                <p className="panel-sub">This month’s income, expenses, and profit</p>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="chart-dot" style={{ background: '#8b7cf6' }} />{' '}
                  Income
                </span>
                <span>
                  <i className="chart-dot" style={{ background: '#6aa8f8' }} />{' '}
                  Expenses
                </span>
                <span>
                  <i className="chart-dot" style={{ background: '#6ed3b2' }} />{' '}
                  Profit
                </span>
              </div>
            </div>
            <PerformanceChart
              income={monthIncome}
              expenses={monthExpenses}
              profit={monthProfit}
            />
          </section>

          <section className="glass-panel">
            <h2>Workshop tasks</h2>
            <p className="panel-sub">
              {data.expenses_by_category.length === 0
                ? 'Suggested next steps to fill the books'
                : 'Expense mix progress this period'}
            </p>
            <div className="task-list">
              {data.expenses_by_category.length === 0 ? (
                <>
                  <div className="task-row task-hint-row">
                    <div className="task-icon" aria-hidden="true">1</div>
                    <div className="task-body">
                      <strong>Log parts & vendor spends</strong>
                      <p className="muted">
                        Expense categories power this chart and month profit.
                      </p>
                    </div>
                    {auth?.role === 'staff' ? (
                      <Link className="btn btn-ghost btn-sm" to="/app/expenses">
                        Add
                      </Link>
                    ) : (
                      <span className="muted task-side">Staff</span>
                    )}
                  </div>
                  <div className="task-row task-hint-row">
                    <div className="task-icon" aria-hidden="true">2</div>
                    <div className="task-body">
                      <strong>Mark invoices paid</strong>
                      <p className="muted">
                        Paid invoices feed income, performance, and journal.
                      </p>
                    </div>
                    {auth?.role === 'staff' ? (
                      <Link className="btn btn-ghost btn-sm" to="/app/invoices">
                        Open
                      </Link>
                    ) : (
                      <span className="muted task-side">Staff</span>
                    )}
                  </div>
                  <div className="task-row task-hint-row">
                    <div className="task-icon" aria-hidden="true">3</div>
                    <div className="task-body">
                      <strong>Stock paint & consumables</strong>
                      <p className="muted">
                        Inventory alerts appear here when reorder levels trip.
                      </p>
                    </div>
                    <Link className="btn btn-ghost btn-sm" to="/app/inventory">
                      Stock
                    </Link>
                  </div>
                </>
              ) : (
                data.expenses_by_category.slice(0, 5).map((row) => {
                  const pct = Math.round((row.total / maxExpense) * 100);
                  return (
                    <div className="task-row" key={row.category}>
                      <div className="task-icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M8 7h8M8 12h8M8 17h5" />
                        </svg>
                      </div>
                      <div className="task-body">
                        <strong>{row.category}</strong>
                        <div className="task-track">
                          <div
                            className="task-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="task-pct">{pct}%</div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="floating-status">
              <span className="chip">
                {data.paid_invoices || 0} paid invoices
              </span>
              <span className="chip soft">
                {data.low_stock_count || 0} low stock
              </span>
              {auth?.role === 'owner' && Number(data.pending_approvals) > 0 ? (
                <Link className="chip soft" to="/app/approvals">
                  {data.pending_approvals} to approve
                </Link>
              ) : null}
            </div>
          </section>
        </div>

        <div className="dash-stack">
          <section className="glass-panel">
            <h2>Recent invoices</h2>
            <p className="panel-sub">Latest workshop documents</p>
            <div className="score-list">
              {data.recent_invoices.length === 0 ? (
                <EmptyHint
                  title="No invoices yet"
                  body={
                    auth?.role === 'staff'
                      ? 'Create a quotation or tax invoice to see customers and totals land here.'
                      : 'Once Mariel or Arnie issue invoices, the latest five appear in this list for a quick check.'
                  }
                  actionTo={
                    auth?.role === 'staff' ? '/app/invoices/new' : '/app/approvals'
                  }
                  actionLabel={
                    auth?.role === 'staff' ? 'New invoice' : 'Open approvals'
                  }
                />
              ) : (
                data.recent_invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    className="score-row"
                    to={`/app/invoices/${inv.id}`}
                  >
                    <div
                      className="score-avatar"
                      style={{ background: avatarTone(inv.customer_name) }}
                    >
                      {initials(inv.customer_name)}
                    </div>
                    <div className="score-meta">
                      <strong>{inv.customer_name}</strong>
                      <span>
                        {inv.invoice_number} · {formatDate(inv.issue_date)} ·{' '}
                        {inv.status}
                      </span>
                    </div>
                    <div className="score-value">{formatMoney(inv.total)}</div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="glass-panel">
            <div className="panel-head">
              <div>
                <h2>Recent expenses</h2>
                <p className="panel-sub">Latest outflow</p>
              </div>
              {auth?.role === 'staff' ? (
                <Link className="btn btn-ghost btn-sm" to="/app/expenses">
                  Add expense
                </Link>
              ) : null}
            </div>
            <div className="score-list">
              {data.recent_expenses.length === 0 ? (
                <EmptyHint
                  title="Books look quiet"
                  body="Record paint, parts, tools, or vendor bills so month expenses and the profit chart stay accurate."
                  actionTo={auth?.role === 'staff' ? '/app/expenses' : null}
                  actionLabel={auth?.role === 'staff' ? 'Log first expense' : null}
                />
              ) : (
                data.recent_expenses.map((exp) => (
                  <div className="score-row" key={exp.id}>
                    <div
                      className="score-avatar"
                      style={{ background: avatarTone(exp.category) }}
                    >
                      {initials(exp.category)}
                    </div>
                    <div className="score-meta">
                      <strong>{exp.description}</strong>
                      <span>
                        {formatDate(exp.expense_date)} · {exp.category}
                      </span>
                    </div>
                    <div className="score-value">{formatMoney(exp.amount)}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="glass-panel">
            <div className="panel-head">
              <div>
                <h2>Inventory</h2>
                <p className="panel-sub">
                  {data.inventory_items || 0} items ·{' '}
                  {formatMoney(data.stock_value || 0)}
                </p>
              </div>
              <Link className="btn btn-ghost btn-sm" to="/app/inventory">
                Open
              </Link>
            </div>
            {(data.inventory_items || 0) === 0 ? (
              <EmptyHint
                title="Stock list is empty"
                body="Add primers, paints, fillers, and consumables with reorder levels so low-stock alerts show up before a job stalls."
                actionTo="/app/inventory"
                actionLabel="Add stock item"
              />
            ) : (data.low_stock_items || []).length === 0 ? (
              <EmptyHint
                title="Stock levels look healthy"
                body={`${data.inventory_items} item${
                  data.inventory_items === 1 ? '' : 's'
                } on hand · value ${formatMoney(
                  data.stock_value || 0
                )}. Alerts appear here when quantity drops to the reorder level.`}
                actionTo="/app/inventory"
                actionLabel="Review inventory"
              />
            ) : (
              <div className="score-list">
                {data.low_stock_items.slice(0, 4).map((item) => (
                  <div className="score-row" key={item.id}>
                    <div
                      className="score-avatar"
                      style={{ background: avatarTone(item.name) }}
                    >
                      {initials(item.name)}
                    </div>
                    <div className="score-meta">
                      <strong>{item.name}</strong>
                      <span>
                        Reorder at {item.reorder_level} {item.unit}
                      </span>
                    </div>
                    <div className="score-value">
                      {item.quantity_on_hand} {item.unit}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
