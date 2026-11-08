import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';

const TYPE_LABELS = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  credit_note: 'Credit note',
  debit_note: 'Debit note',
  sale: 'Sale',
  expense: 'Expense',
};

export default function Journal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState(null);
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [to, setTo] = useState(searchParams.get('to') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const listReturnPath = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (type) params.set('type', type);
    const qs = params.toString();
    return qs ? `/app/journal?${qs}` : '/app/journal';
  }, [from, to, type]);

  async function load(next = { from, to, type }) {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (next.from) params.from = next.from;
      if (next.to) params.to = next.to;
      if (next.type) params.type = next.type;
      const data = await api.getJournal(params);
      setEntries(data.entries || []);
      setTotals(data.totals || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      type: searchParams.get('type') || '',
    });
  }, []);

  function applyFilters() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (type) params.type = type;
    setSearchParams(params);
    load({ from, to, type });
  }

  function openEntry(entry) {
    if (!entry?.link) return;
    navigate(entry.link, { state: { journalReturn: listReturnPath } });
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Journal</h1>
          <p>
            All invoices, credit notes, debit notes, sales, and expenses in one
            tally — click any row to drill down, then return here.
          </p>
        </div>
      </header>

      {totals && (
        <section className="stats-grid" style={{ marginBottom: 18 }}>
          <div className="stat-card">
            <p className="stat-label">Credits (income)</p>
            <p className="stat-value">{formatMoney(totals.credit)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Debits (outflow)</p>
            <p className="stat-value">{formatMoney(totals.debit)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Net</p>
            <p className="stat-value">{formatMoney(totals.net)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Entries</p>
            <p className="stat-value">{totals.count}</p>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="toolbar">
          <input
            className="input"
            type="date"
            style={{ maxWidth: 170 }}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            title="From date"
          />
          <input
            className="input"
            type="date"
            style={{ maxWidth: 170 }}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            title="To date"
          />
          <select
            className="select"
            style={{ maxWidth: 180 }}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="quotation">Quotations</option>
            <option value="invoice">Invoices</option>
            <option value="credit_note">Credit notes</option>
            <option value="debit_note">Debit notes</option>
            <option value="sale">Sales</option>
            <option value="expense">Expenses</option>
          </select>
          <button className="btn btn-ghost" onClick={applyFilters}>
            Apply
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted">Loading journal…</p>
        ) : entries.length === 0 ? (
          <p className="empty">No journal entries for this filter.</p>
        ) : (
          <table className="journal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Posting</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Category</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`journal-row${entry.include_in_tally ? '' : ' muted-row'}`}
                  onClick={() => openEntry(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openEntry(entry);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td>{formatDate(entry.date)}</td>
                  <td>
                    <span className={`badge ${entry.entry_type}`}>
                      {TYPE_LABELS[entry.entry_type] || entry.entry_type}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        entry.posting_status === 'draft' ? 'draft' : 'paid'
                      }`}
                    >
                      {entry.posting_status === 'draft' ? 'Draft' : 'Posted'}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={entry.link}
                      state={{ journalReturn: listReturnPath }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {entry.reference}
                    </Link>
                  </td>
                  <td>
                    {entry.description}
                    {!entry.include_in_tally ? (
                      <span className="muted"> · not in tally</span>
                    ) : null}
                  </td>
                  <td>{entry.category || '—'}</td>
                  <td>{entry.debit > 0 ? formatMoney(entry.debit) : '—'}</td>
                  <td>{entry.credit > 0 ? formatMoney(entry.credit) : '—'}</td>
                  <td>
                    {entry.include_in_tally ? formatMoney(entry.balance) : '—'}
                  </td>
                  <td>
                    <Link
                      className="btn btn-ghost btn-sm"
                      to={entry.link}
                      state={{ journalReturn: listReturnPath }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr>
                  <td colSpan={6}>
                    <strong>Tally</strong>
                    {totals.by_type && (
                      <span className="muted">
                        {' '}
                        · {totals.by_type.invoice} invoices ·{' '}
                        {totals.by_type.credit_note} credit notes ·{' '}
                        {totals.by_type.debit_note || 0} debit notes ·{' '}
                        {totals.by_type.sale} sales · {totals.by_type.expense}{' '}
                        expenses
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>{formatMoney(totals.debit)}</strong>
                  </td>
                  <td>
                    <strong>{formatMoney(totals.credit)}</strong>
                  </td>
                  <td>
                    <strong>{formatMoney(totals.net)}</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </section>
    </div>
  );
}
