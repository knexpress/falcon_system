import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (status) params.status = status;
      if (q.trim()) params.q = q.trim();
      setInvoices(await api.getInvoices(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  async function handleDownloadPdf(inv) {
    setDownloadingId(inv.id);
    setError('');
    try {
      await api.downloadInvoicePdf(
        inv.id,
        `${inv.invoice_number || 'invoice'}.pdf`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleCreditNote(id, number) {
    if (
      !window.confirm(
        `Issue credit note for ${number}? The invoice will stay on file (not deleted) and any linked income will be reversed.`
      )
    ) {
      return;
    }
    try {
      const updated = await api.deleteInvoice(id);
      setInvoices((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updated } : i))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Invoices</h1>
          <p>Create, edit, and track customer job invoices.</p>
        </div>
        <Link className="btn btn-primary" to="/app/invoices/new">
          New invoice
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
            style={{ maxWidth: 180 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
            <option value="credit_note">Credit note</option>
          </select>
          <button className="btn btn-ghost" onClick={load}>
            Search
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="empty">No invoices found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Issue date</th>
                <th>Status</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link to={`/app/invoices/${inv.id}`}>{inv.invoice_number}</Link>
                  </td>
                  <td>{inv.customer_name}</td>
                  <td>
                    {[inv.vehicle_make, inv.vehicle_model].filter(Boolean).join(' ') ||
                      '—'}
                    {inv.vehicle_plate ? ` · ${inv.vehicle_plate}` : ''}
                  </td>
                  <td>{formatDate(inv.issue_date)}</td>
                  <td>
                    <span className={`badge ${inv.status}`}>
                      {inv.status === 'credit_note'
                        ? 'Credit note'
                        : inv.status}
                    </span>
                  </td>
                  <td>{formatMoney(inv.total)}</td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-ghost btn-sm" to={`/app/invoices/${inv.id}/edit`}>
                        Edit
                      </Link>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={downloadingId === inv.id}
                        onClick={() => handleDownloadPdf(inv)}
                      >
                        {downloadingId === inv.id ? 'PDF…' : 'Download PDF'}
                      </button>
                      {inv.status !== 'credit_note' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() =>
                            handleCreditNote(inv.id, inv.invoice_number)
                          }
                        >
                          Credit note
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
