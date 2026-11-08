import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';

function statusLabel(status) {
  if (status === 'pending_approval') return 'Pending approval';
  if (status === 'approved') return 'Approved';
  if (status === 'changes_requested') return 'Changes requested';
  if (status === 'rejected') return 'Rejected';
  return status;
}

export default function Quotations() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (status) params.status = status;
      if (q.trim()) params.q = q.trim();
      setRows(await api.getQuotations(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Quotations</h1>
          <p>
            Create job quotations. They go to Cedrick for approval, then appear
            on Invoices so you can generate the tax invoice.
          </p>
        </div>
        <Link className="btn btn-primary" to="/app/quotations/new">
          New quotation
        </Link>
      </header>

      <section className="panel">
        <div className="toolbar">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Search number, customer, plate…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select
            className="select"
            style={{ maxWidth: 200 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending_approval">Pending approval</option>
            <option value="changes_requested">Changes requested</option>
            <option value="approved">Approved</option>
          </select>
          <button className="btn btn-ghost" onClick={load}>
            Search
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="empty">No quotations found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Prepared by</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Issue date</th>
                <th>Status</th>
                <th>Journal</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link to={`/app/quotations/${row.id}`}>
                      {row.invoice_number}
                    </Link>
                  </td>
                  <td>{row.prepared_by || row.created_by || '—'}</td>
                  <td>{row.customer_name}</td>
                  <td>
                    {[row.vehicle_make, row.vehicle_model]
                      .filter(Boolean)
                      .join(' ') || '—'}
                    {row.vehicle_plate ? ` · ${row.vehicle_plate}` : ''}
                  </td>
                  <td>{formatDate(row.issue_date)}</td>
                  <td>
                    <span className={`badge ${row.status}`}>
                      {statusLabel(row.status)}
                    </span>
                    {row.status === 'changes_requested' && row.approval_note ? (
                      <div className="muted" style={{ fontSize: '0.82rem', marginTop: 4 }}>
                        {row.approval_note}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className="badge draft">
                      {row.journal_status || 'draft'}
                    </span>
                  </td>
                  <td>{formatMoney(row.total)}</td>
                  <td>
                    <div className="row-actions">
                      <Link
                        className="btn btn-ghost btn-sm"
                        to={`/app/quotations/${row.id}/edit`}
                      >
                        Edit
                      </Link>
                      {row.status === 'approved' && (
                        <Link
                          className="btn btn-primary btn-sm"
                          to="/app/invoices"
                        >
                          Go to invoices
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
