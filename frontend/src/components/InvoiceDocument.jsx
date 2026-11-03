import { formatDate } from '../api.js';
import fieldMap from './invoiceFieldMap.json';
import './InvoiceDocument.css';

const MAX_ROWS = 14;
const fieldsByName = Object.fromEntries(fieldMap.map((f) => [f.name, f]));

function moneyPlain(value) {
  return (Number(value) || 0).toFixed(2);
}

function AcroField({ name, children, className = '' }) {
  const field = fieldsByName[name];
  if (!field) return null;
  const text = children == null ? '' : String(children);
  if (!text) return null;

  return (
    <div
      className={`inv-acro ${className}`.trim()}
      style={{
        left: `${field.left}%`,
        top: `${field.top}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
      }}
      title={text}
    >
      <span>{text}</span>
    </div>
  );
}

export default function InvoiceDocument({ invoice }) {
  if (!invoice) return null;

  const items = (invoice.items || []).slice(0, MAX_ROWS);
  const modelYear = [invoice.vehicle_model, invoice.vehicle_year]
    .filter(Boolean)
    .join(' / ');

  return (
    <div className="inv-sheet" id="invoice-print-area">
      <img
        className="inv-bg"
        src="/invoice-template.png"
        alt="Falcon Revive tax invoice template"
        draggable={false}
      />

      <div className="inv-layer">
        <AcroField name="customer_name">{invoice.customer_name}</AcroField>
        <AcroField name="customer_trn_id">{invoice.customer_trn}</AcroField>
        <AcroField name="customer_mobile">{invoice.customer_phone}</AcroField>
        <AcroField name="customer_address" className="inv-acro-wrap">
          {invoice.customer_address}
        </AcroField>

        <AcroField name="invoice_number">{invoice.invoice_number}</AcroField>
        <AcroField name="invoice_date">
          {invoice.issue_date ? formatDate(invoice.issue_date) : ''}
        </AcroField>
        <AcroField name="job_order_number">{invoice.job_order_no}</AcroField>
        <AcroField name="vehicle_make">{invoice.vehicle_make}</AcroField>
        <AcroField name="vehicle_model_year">{modelYear}</AcroField>
        <AcroField name="vehicle_plate_number">{invoice.vehicle_plate}</AcroField>
        <AcroField name="vehicle_mileage">{invoice.mileage}</AcroField>

        {items.map((item, index) => {
          if (!item?.description) return null;
          const n = String(index + 1).padStart(2, '0');
          return (
            <div key={item.id || index}>
              <AcroField name={`item_${n}_description`}>{item.description}</AcroField>
              <AcroField name={`item_${n}_unit`}>{item.unit || 'Job'}</AcroField>
              <AcroField name={`item_${n}_quantity`}>{item.quantity}</AcroField>
              <AcroField name={`item_${n}_rate_aed`}>
                {moneyPlain(item.unit_price)}
              </AcroField>
              <AcroField name={`item_${n}_vat_percent`}>
                {item.vat_rate ?? 5}
              </AcroField>
              <AcroField name={`item_${n}_vat_amount_aed`}>
                {moneyPlain(item.vat_amount)}
              </AcroField>
              <AcroField name={`item_${n}_amount_aed`}>
                {moneyPlain(item.amount)}
              </AcroField>
            </div>
          );
        })}

        <AcroField name="notes" className="inv-acro-wrap inv-acro-notes">
          {invoice.notes}
        </AcroField>

        <AcroField name="subtotal_aed" className="inv-acro-num">
          {moneyPlain(invoice.subtotal)}
        </AcroField>
        <AcroField name="discount_aed" className="inv-acro-num">
          {moneyPlain(invoice.discount)}
        </AcroField>
        <AcroField name="vat_total_aed" className="inv-acro-num">
          {moneyPlain(invoice.tax_amount)}
        </AcroField>
        <AcroField name="net_total_aed" className="inv-acro-num inv-acro-net">
          {moneyPlain(invoice.total)}
        </AcroField>

        <AcroField name="prepared_by">{invoice.prepared_by}</AcroField>
        <AcroField name="authorized_signature_name">
          {invoice.authorized_by}
        </AcroField>
        <AcroField name="customer_received_by">{invoice.received_by}</AcroField>
      </div>
    </div>
  );
}

export function InvoiceDocumentPreview({ form, customers, invoiceNumber = 'INV-····' }) {
  const customer = customers.find((c) => String(c.id) === String(form.customer_id));

  const items = (form.items || [])
    .filter((i) => i.description?.trim())
    .map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unit_price = Number(item.unit_price) || 0;
      const amount = Math.round(quantity * unit_price * 100) / 100;
      const vat_rate = Number(item.vat_rate ?? form.tax_rate ?? 5) || 0;
      const vat_amount = Math.round(amount * (vat_rate / 100) * 100) / 100;
      return {
        ...item,
        quantity,
        unit_price,
        amount,
        vat_rate,
        vat_amount,
      };
    });

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const discount = Math.min(Number(form.discount) || 0, subtotal);
  const taxable = subtotal - discount;
  const tax_amount =
    discount > 0
      ? Math.round(taxable * ((Number(form.tax_rate) || 5) / 100) * 100) / 100
      : items.reduce((s, i) => s + i.vat_amount, 0);
  const total = Math.round((taxable + tax_amount) * 100) / 100;

  const invoice = {
    invoice_number: invoiceNumber,
    customer_name: customer?.name || form.customer_name_preview || '',
    customer_trn: form.customer_trn || customer?.trn || '',
    customer_phone: form.customer_phone || customer?.phone || '',
    customer_address: form.customer_address || customer?.address || '',
    issue_date: form.issue_date,
    job_order_no: form.job_order_no,
    vehicle_make: form.vehicle_make,
    vehicle_model: form.vehicle_model,
    vehicle_year: form.vehicle_year,
    vehicle_plate: form.vehicle_plate,
    mileage: form.mileage,
    notes: form.notes,
    prepared_by: form.prepared_by,
    authorized_by: form.authorized_by,
    received_by: form.received_by,
    items,
    subtotal,
    discount,
    tax_amount,
    total,
  };

  return <InvoiceDocument invoice={invoice} />;
}
