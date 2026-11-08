import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';

const TYPE_LABELS = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  credit_note: 'Credit note',
  debit_note: 'Debit note',
  sale: 'Sale',
  expense: 'Expense',
};

export default function JournalEntry() {
  const { type, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const returnTo = useMemo(() => {
    const fromState = location.state?.journalReturn;
    if (fromState) return fromState;
    const params = new URLSearchParams(location.search);
    const back = params.get('return');
    return back ? decodeURIComponent(back) : '/app/journal';
  }, [location.state, location.search]);

  const entryType = type;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        let data = null;
        if (
          type === 'invoice' ||
          type === 'credit_note' ||
          type === 'debit_note' ||
          type === 'quotation'
        ) {
          data = await api.getInvoice(id);
        } else if (type === 'sale') {
          data = await api.getSale(id);
        } else if (type === 'expense') {
          data = await api.getExpense(id);
        } else {
          throw new Error('Unknown journal entry type');
        }
        if (!cancelled) setRecord(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  function goBack() {
    navigate(returnTo);
  }

  if (loading) return <p className="muted">Loading entry…</p>;
  if (error && !record) {
    return (
      <div>
        <div className="error-banner">{error}</div>
        <button className="btn btn-ghost" onClick={goBack}>
          ← Back to journal
        </button>
      </div>
    );
  }

  const isInvoice =
    type === 'invoice' ||
    type === 'credit_note' ||
    type === 'debit_note' ||
    type === 'quotation';
  const isSale = type === 'sale';
  const isExpense = type === 'expense';

  const title = isInvoice
    ? record.invoice_number
    : isSale
      ? record.invoice_number || `SALE-${record.id}`
      : `EXP-${record.id}`;

  const subtitle = isInvoice
    ? `${record.customer_name || 'Customer'} · ${
        record.status === 'credit_note'
          ? 'Credit note'
          : record.status === 'debit_note'
            ? 'Debit note'
            : record.status
      }`
    : isSale
      ? record.description
      : record.description;

  const amount = isInvoice
    ? record.total
    : isSale
      ? record.amount
      : record.amount;

  const date = isInvoice
    ? record.issue_date
    : isSale
      ? record.sale_date
      : record.expense_date;

  const sourceEditPath = isInvoice
    ? `/app/invoices/${record.id}/edit`
    : isSale
      ? `/app/sales?focus=${record.id}`
      : `/app/expenses?focus=${record.id}`;

  const sourceViewPath = isInvoice
    ? `/app/invoices/${record.id}`
    : isSale
      ? `/app/sales?focus=${record.id}`
      : `/app/expenses?focus=${record.id}`;

  return (
    <div>
      <header className="page-header">
        <div>
          <p className="muted" style={{ margin: '0 0 6px' }}>
            Journal · {TYPE_LABELS[entryType] || type}
          </p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="row-actions">
          <button className="btn btn-ghost" onClick={goBack}>
            ← Back to journal
          </button>
          <Link
            className="btn btn-ghost"
            to={sourceViewPath}
            state={{ journalReturn: returnTo }}
          >
            Open full record
          </Link>
          <Link
            className="btn btn-primary"
            to={sourceEditPath}
            state={{ journalReturn: returnTo }}
          >
            Edit
          </Link>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="stats-grid" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <p className="stat-label">Date</p>
          <p className="stat-value" style={{ fontSize: '1.4rem' }}>
            {formatDate(date)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Amount</p>
          <p className="stat-value">{formatMoney(amount)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Type</p>
          <p className="stat-value" style={{ fontSize: '1.4rem' }}>
            <span className={`badge ${entryType}`}>
              {TYPE_LABELS[entryType] || type}
            </span>
          </p>
        </div>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Entry details</h2>
        <dl className="detail-grid">
          {isInvoice && (
            <>
              <div>
                <dt>Customer</dt>
                <dd>{record.customer_name || '—'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`badge ${record.status}`}>
                    {record.status === 'credit_note'
                      ? 'Credit note'
                      : record.status === 'debit_note'
                        ? 'Debit note'
                        : record.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Vehicle</dt>
                <dd>
                  {[record.vehicle_make, record.vehicle_model, record.vehicle_plate]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatMoney(record.subtotal)}</dd>
              </div>
              <div>
                <dt>VAT</dt>
                <dd>{formatMoney(record.tax_amount)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatMoney(record.total)}</dd>
              </div>
              <div className="span-2">
                <dt>Notes</dt>
                <dd>{record.notes || '—'}</dd>
              </div>
            </>
          )}

          {isSale && (
            <>
              <div>
                <dt>Category</dt>
                <dd style={{ textTransform: 'capitalize' }}>
                  {record.category || '—'}
                </dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd style={{ textTransform: 'capitalize' }}>
                  {record.payment_method || '—'}
                </dd>
              </div>
              <div>
                <dt>Linked invoice</dt>
                <dd>
                  {record.invoice_id ? (
                    <Link
                      to={`/app/journal/invoice/${record.invoice_id}`}
                      state={{ journalReturn: returnTo }}
                    >
                      {record.invoice_number || `#${record.invoice_id}`}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="span-2">
                <dt>Description</dt>
                <dd>{record.description || '—'}</dd>
              </div>
              <div className="span-2">
                <dt>Notes</dt>
                <dd>{record.notes || '—'}</dd>
              </div>
            </>
          )}

          {isExpense && (
            <>
              <div>
                <dt>Category</dt>
                <dd style={{ textTransform: 'capitalize' }}>
                  {record.category || '—'}
                </dd>
              </div>
              <div>
                <dt>Vendor</dt>
                <dd>{record.vendor || '—'}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd style={{ textTransform: 'capitalize' }}>
                  {record.payment_method || '—'}
                </dd>
              </div>
              <div className="span-2">
                <dt>Description</dt>
                <dd>{record.description || '—'}</dd>
              </div>
              <div className="span-2">
                <dt>Notes</dt>
                <dd>{record.notes || '—'}</dd>
              </div>
            </>
          )}
        </dl>

        {isInvoice && Array.isArray(record.items) && record.items.length > 0 && (
          <>
            <h3>Line items</h3>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.item_type}</td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                    <td>{formatMoney(item.unit_price)}</td>
                    <td>{formatMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <div className="row-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={goBack}>
          ← Back to journal
        </button>
        <Link className="btn btn-primary" to={returnTo}>
          Return to tally list
        </Link>
      </div>
    </div>
  );
}
