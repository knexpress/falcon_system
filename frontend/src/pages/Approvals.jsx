import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';
import { getAuth } from '../components/RequireAuth.jsx';
import InvoiceDocument from '../components/InvoiceDocument.jsx';
import { isOwnerRole } from '../roles.js';

export default function Approvals() {
  const auth = getAuth();
  const isOwner = isOwnerRole(auth?.role);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendBackNote, setSendBackNote] = useState('');
  const [mode, setMode] = useState('review'); // review | send_back

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await api.getPendingApprovals());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOwner) return undefined;
    load();
    return undefined;
  }, [isOwner]);

  if (!isOwner) {
    return <Navigate to="/app" replace />;
  }

  async function openPreview(row) {
    setError('');
    setMode('review');
    setSendBackNote('');
    setPreviewLoading(true);
    setPreview({ ...row, items: [] });
    try {
      const full = await api.getInvoice(row.id);
      setPreview(full);
    } catch (err) {
      setError(err.message);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (busy) return;
    setPreview(null);
    setMode('review');
    setSendBackNote('');
  }

  async function confirmApprove() {
    if (!preview?.id) return;
    setBusy(true);
    setError('');
    try {
      await api.approveInvoice(preview.id);
      closePreview();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmSendBack() {
    if (!preview?.id) return;
    const note = sendBackNote.trim();
    if (!note) {
      setError('A note is required when sending a quotation back.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.sendBackQuotation(preview.id, { note });
      closePreview();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Approvals</h1>
          <p>
            Open a live preview, then approve for Invoices — or send back with a
            mandatory note so Mariel / Arnie can edit.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </header>

      <section className="panel">
        {error && !preview && <div className="error-banner">{error}</div>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="empty">No quotations waiting for approval.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Prepared by</th>
                <th>Customer</th>
                <th>Issue date</th>
                <th>Requested</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link to={`/app/quotations/${inv.id}`}>
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td>{inv.prepared_by || inv.created_by || '—'}</td>
                  <td>{inv.customer_name}</td>
                  <td>{formatDate(inv.issue_date)}</td>
                  <td>
                    <span className="badge pending_approval">
                      → {inv.requested_status || 'sent'}
                    </span>
                  </td>
                  <td>{formatMoney(inv.total)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openPreview(inv)}
                      >
                        Approve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {preview && (
        <div
          className="http-notify-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approval-preview-title"
          onClick={closePreview}
        >
          <div
            className="approval-preview-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="approval-preview-head">
              <div>
                <p className="muted" style={{ margin: 0 }}>
                  Live quotation preview
                </p>
                <h2 id="approval-preview-title" style={{ margin: '4px 0 0' }}>
                  {preview.invoice_number}
                </h2>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  {preview.customer_name} ·{' '}
                  {formatMoney(preview.total)} · prepared by{' '}
                  {preview.prepared_by || preview.created_by || '—'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closePreview}
                disabled={busy}
              >
                Close
              </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="approval-preview-body">
              {previewLoading ? (
                <p className="muted">Loading preview…</p>
              ) : (
                <div className="approval-preview-doc">
                  <InvoiceDocument invoice={preview} />
                </div>
              )}
            </div>

            {mode === 'send_back' ? (
              <div className="approval-preview-actions">
                <label className="approval-note-field">
                  Note for Mariel / Arnie (required)
                  <textarea
                    className="input"
                    rows={3}
                    value={sendBackNote}
                    onChange={(e) => setSendBackNote(e.target.value)}
                    placeholder="What needs to change before you can approve?"
                    required
                  />
                </label>
                <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => {
                      setMode('review');
                      setError('');
                    }}
                  >
                    Back to preview
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy || !sendBackNote.trim()}
                    onClick={confirmSendBack}
                  >
                    {busy ? 'Sending…' : 'Send back for edits'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="approval-preview-actions row-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy || previewLoading}
                  onClick={() => {
                    setMode('send_back');
                    setError('');
                  }}
                >
                  Send back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || previewLoading}
                  onClick={confirmApprove}
                >
                  {busy ? 'Approving…' : 'Confirm approve'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
