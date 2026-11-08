import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import InvoiceDocument from '../components/InvoiceDocument.jsx';

export default function InvoiceDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const isQuotationRoute = location.pathname.includes('/quotations/');
  const journalReturn = location.state?.journalReturn;
  const backTo =
    journalReturn ||
    (isQuotationRoute ? '/app/quotations' : '/app/invoices');
  const backLabel = journalReturn ? '← Back to journal' : 'Back';

  useEffect(() => {
    api
      .getInvoice(id)
      .then(setInvoice)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleCreditNote() {
    if (
      !window.confirm(
        `Issue credit note for ${invoice.invoice_number}? The invoice stays on file and any linked income is reversed.`
      )
    ) {
      return;
    }
    try {
      const updated = await api.deleteInvoice(id);
      setInvoice(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDebitNote() {
    if (
      !window.confirm(
        `Issue debit note for ${invoice.invoice_number}? The invoice stays on file and the amount is posted as additional income / charge due.`
      )
    ) {
      return;
    }
    try {
      const updated = await api.issueDebitNote(id);
      setInvoice(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    setError('');
    try {
      await api.downloadInvoicePdf(
        id,
        `${invoice.invoice_number || 'invoice'}.pdf`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleGenerateInvoice() {
    if (
      !window.confirm(
        `Generate tax invoice from ${invoice.invoice_number}? Journal entry will be posted.`
      )
    ) {
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const created = await api.generateInvoiceFromQuotation(id);
      navigate(`/app/invoices/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (error && !invoice) return <div className="error-banner">{error}</div>;
  if (!invoice) return <p className="muted">Loading…</p>;

  const isQuotation = invoice.doc_type === 'quotation';
  const editPath = isQuotation
    ? `/app/quotations/${id}/edit`
    : `/app/invoices/${id}/edit`;

  return (
    <div>
      <header className="page-header no-print">
        <div>
          <h1>{invoice.invoice_number}</h1>
          <p>
            {isQuotation
              ? 'Quotation preview — Cedrick approval required before generating an invoice.'
              : 'Preview uses official field positions. Download PDF fills the Falcon Revive fillable template.'}
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn btn-ghost" to={backTo}>
            {backLabel}
          </Link>
          <Link className="btn btn-ghost" to={editPath}>
            Edit
          </Link>
          {isQuotation && invoice.status === 'approved' && (
            <button
              className="btn btn-primary"
              onClick={handleGenerateInvoice}
              disabled={generating}
            >
              {generating ? 'Generating…' : 'Generate invoice'}
            </button>
          )}
          {!isQuotation && (
            <button
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => window.print()}>
            Print preview
          </button>
          {!isQuotation &&
            invoice.status !== 'credit_note' &&
            invoice.status !== 'debit_note' && (
              <>
                <button className="btn btn-danger" onClick={handleCreditNote}>
                  Credit note
                </button>
                <button className="btn btn-ghost" onClick={handleDebitNote}>
                  Debit note
                </button>
              </>
            )}
          {!isQuotation && invoice.status === 'debit_note' && (
            <button className="btn btn-danger" onClick={handleCreditNote}>
              Credit note
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-banner no-print">{error}</div>}

      <div className="invoice-detail-wrap">
        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  );
}
