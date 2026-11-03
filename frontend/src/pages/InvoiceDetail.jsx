import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import InvoiceDocument from '../components/InvoiceDocument.jsx';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api
      .getInvoice(id)
      .then(setInvoice)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${invoice.invoice_number}?`)) return;
    try {
      await api.deleteInvoice(id);
      navigate('/invoices');
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

  if (error && !invoice) return <div className="error-banner">{error}</div>;
  if (!invoice) return <p className="muted">Loading invoice…</p>;

  return (
    <div>
      <header className="page-header no-print">
        <div>
          <h1>{invoice.invoice_number}</h1>
          <p>
            Preview uses official field positions. Download PDF fills the
            Falcon Revive fillable template.
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn btn-ghost" to="/invoices">
            Back
          </Link>
          <Link className="btn btn-ghost" to={`/invoices/${id}/edit`}>
            Edit
          </Link>
          <button
            className="btn btn-primary"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            Print preview
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </header>

      {error && <div className="error-banner no-print">{error}</div>}

      <div className="invoice-detail-wrap">
        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  );
}
