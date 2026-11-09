import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatDateTime, formatMoney } from '../api.js';
import { getAuth } from '../components/RequireAuth.jsx';

function NoteIcon({ kind }) {
  const isCredit = kind === 'credit';
  return (
    <svg
      className="btn-vector"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      {isCredit ? (
        <path
          fill="currentColor"
          d="M5 11h14v2H5z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z"
        />
      )}
    </svg>
  );
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pdfBusyId, setPdfBusyId] = useState(null);
  const [backupStatus, setBackupStatus] = useState(null);
  const [backupLogs, setBackupLogs] = useState([]);
  const [backupBusy, setBackupBusy] = useState(false);
  const [showBackupHistory, setShowBackupHistory] = useState(false);
  const [genBusyId, setGenBusyId] = useState(null);

  async function loadBackups() {
    try {
      const [statusData, logs] = await Promise.all([
        api.getBackupStatus(),
        api.getBackupLogs(),
      ]);
      setBackupStatus(statusData);
      setBackupLogs(logs);
    } catch (err) {
      // Don't block invoices list if backup status fails
      console.error(err);
    }
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = { doc_type: 'invoice_board' };
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
    loadBackups();
  }, [status]);

  async function handleViewPdf(inv) {
    setPdfBusyId(inv.id);
    setError('');
    try {
      await api.viewInvoicePdf(inv.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfBusyId(null);
    }
  }

  async function handleDownloadPdf(inv) {
    setPdfBusyId(inv.id);
    setError('');
    try {
      await api.downloadInvoicePdf(
        inv.id,
        `${inv.invoice_number || 'invoice'}.pdf`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfBusyId(null);
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

  async function handleDebitNote(id, number) {
    if (
      !window.confirm(
        `Issue debit note for ${number}? The invoice stays on file and the amount is posted as additional income / charge due.`
      )
    ) {
      return;
    }
    try {
      const updated = await api.issueDebitNote(id);
      setInvoices((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updated } : i))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateInvoice(inv) {
    if (
      !window.confirm(
        `Generate tax invoice from quotation ${inv.invoice_number}? This posts the journal entry.`
      )
    ) {
      return;
    }
    setGenBusyId(inv.id);
    setError('');
    try {
      await api.generateInvoiceFromQuotation(inv.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenBusyId(null);
    }
  }

  async function handleDailyBackup() {
    setBackupBusy(true);
    setError('');
    try {
      const auth = getAuth();
      const who = auth?.username || auth?.name || 'staff';
      await api.downloadDailyBackup(who);
      await loadBackups();
      window.dispatchEvent(new Event('falcon-backup-done'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBackupBusy(false);
    }
  }

  const lastBackupAt = backupStatus?.last_backup?.backed_up_at;
  const todayDone = Boolean(backupStatus?.today_backup_done);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Invoices</h1>
          <p>
            Tax invoices and open quotations ready to convert. Start new jobs
            from Quotations.
          </p>
        </div>
        <div className="row-actions">
          <button
            className="btn btn-ghost"
            disabled={backupBusy}
            onClick={handleDailyBackup}
            title="Download full workshop backup to this computer"
          >
            {backupBusy ? 'Backing up…' : 'Download daily backup'}
          </button>
          <Link className="btn btn-ghost" to="/app/quotations/new">
            New quotation
          </Link>
          <Link className="btn btn-primary" to="/app/invoices/new">
            New invoice
          </Link>
        </div>
      </header>

      <section className={`panel backup-panel${todayDone ? '' : ' backup-due'}`}>
        <div className="backup-row">
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>
              Daily local backup
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              Important: take a backup every day at <strong>12:00 AM</strong>{' '}
              (Asia/Dubai). File saves to this computer and the time is logged.
            </p>
            <p style={{ margin: '8px 0 0' }}>
              {lastBackupAt ? (
                <>
                  Last backup:{' '}
                  <strong>{formatDateTime(lastBackupAt)}</strong>
                  {backupStatus?.last_backup?.created_by
                    ? ` · by ${backupStatus.last_backup.created_by}`
                    : ''}
                  {backupStatus?.last_backup?.invoice_count != null
                    ? ` · ${backupStatus.last_backup.invoice_count} invoices`
                    : ''}
                </>
              ) : (
                <strong>No backup recorded yet</strong>
              )}
            </p>
          </div>
          <div className="row-actions">
            <button
              className={`btn ${todayDone ? 'btn-ghost' : 'btn-primary'}`}
              disabled={backupBusy}
              onClick={handleDailyBackup}
            >
              {backupBusy
                ? 'Preparing…'
                : todayDone
                  ? 'Download another backup'
                  : 'Download today’s backup'}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setShowBackupHistory((v) => !v)}
            >
              {showBackupHistory ? 'Hide history' : 'Backup history'}
            </button>
          </div>
        </div>

        {showBackupHistory && (
          <div style={{ marginTop: 14 }}>
            {backupLogs.length === 0 ? (
              <p className="empty">No backup history yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date &amp; time</th>
                    <th>File</th>
                    <th>By</th>
                    <th>Invoices</th>
                    <th>Customers</th>
                    <th>Vehicles</th>
                    <th>Sales</th>
                    <th>Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {backupLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.backed_up_at)}</td>
                      <td>{log.filename}</td>
                      <td>{log.created_by || '—'}</td>
                      <td>{log.invoice_count}</td>
                      <td>{log.customer_count}</td>
                      <td>{log.vehicle_count}</td>
                      <td>{log.sale_count}</td>
                      <td>{log.expense_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

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
            <option value="debit_note">Debit note</option>
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
                      {inv.doc_type === 'quotation'
                        ? `Quotation · ${inv.status}`
                        : inv.status === 'credit_note'
                          ? 'Credit note'
                          : inv.status === 'debit_note'
                            ? 'Debit note'
                            : inv.status}
                    </span>
                  </td>
                  <td>{formatMoney(inv.total)}</td>
                  <td>
                    <div className="row-actions row-actions-inline">
                      {inv.doc_type === 'quotation' &&
                      inv.status !== 'cancelled' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={genBusyId === inv.id}
                          onClick={() => handleGenerateInvoice(inv)}
                        >
                          {genBusyId === inv.id
                            ? 'Generating…'
                            : 'Generate invoice'}
                        </button>
                      ) : (
                        <>
                          <Link
                            className="btn btn-ghost btn-sm"
                            to={`/app/invoices/${inv.id}/edit`}
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={pdfBusyId === inv.id}
                            onClick={() => handleViewPdf(inv)}
                          >
                            {pdfBusyId === inv.id ? '…' : 'View'}
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={pdfBusyId === inv.id}
                            onClick={() => handleDownloadPdf(inv)}
                          >
                            {pdfBusyId === inv.id ? '…' : 'PDF'}
                          </button>
                          {inv.status !== 'credit_note' &&
                            inv.status !== 'debit_note' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm btn-icon"
                                  title="Credit note"
                                  aria-label="Credit note"
                                  onClick={() =>
                                    handleCreditNote(inv.id, inv.invoice_number)
                                  }
                                >
                                  <NoteIcon kind="credit" />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm btn-icon"
                                  title="Debit note"
                                  aria-label="Debit note"
                                  onClick={() =>
                                    handleDebitNote(inv.id, inv.invoice_number)
                                  }
                                >
                                  <NoteIcon kind="debit" />
                                </button>
                              </>
                            )}
                          {inv.status === 'debit_note' && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm btn-icon"
                              title="Credit note"
                              aria-label="Credit note"
                              onClick={() =>
                                handleCreditNote(inv.id, inv.invoice_number)
                              }
                            >
                              <NoteIcon kind="credit" />
                            </button>
                          )}
                        </>
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
