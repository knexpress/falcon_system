import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';

export default function Quotations() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [genBusyId, setGenBusyId] = useState(null);

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

  async function handleGenerateInvoice(row) {
    if (
      !window.confirm(
        `Generate tax invoice from ${row.invoice_number}? This posts the journal entry.`
      )
    ) {
      return;
    }
    setGenBusyId(row.id);
    setError('');
    try {
      const created = await api.generateInvoiceFromQuotation(row.id);
      navigate(`/app/invoices/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenBusyId(null);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Quotations</h1>
          <p>
            Create a quotation, then use <strong>Generate invoice</strong> to
            turn it into a tax invoice — no approval step.
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
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
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
                    <span className={`badge ${row.status}`}>{row.status}</span>
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
                      {row.status !== 'cancelled' && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={genBusyId === row.id}
                          onClick={() => handleGenerateInvoice(row)}
                        >
                          {genBusyId === row.id
                            ? 'Generating…'
                            : 'Generate invoice'}
                        </button>
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
