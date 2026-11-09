import { all } from './db.js';

/** Official invoice series starts at 00290 (5 digits). */
export const INVOICE_SERIES_START = 290;
export const INVOICE_NUMBER_WIDTH = 5;

export function formatInvoiceNumber(n) {
  return String(n).padStart(INVOICE_NUMBER_WIDTH, '0');
}

export function parseInvoiceNumber(value) {
  const match = String(value || '').match(/(\d+)\s*$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return Number.isNaN(num) ? null : num;
}

export async function nextInvoiceNumber() {
  // Scan every non-QT number so legacy quotations that reused the
  // invoice series (e.g. 00297) cannot collide on generate-invoice.
  const rows = await all(
    `SELECT invoice_number FROM invoices
     WHERE invoice_number IS NOT NULL
       AND invoice_number NOT ILIKE 'QT-%'`
  );
  let max = INVOICE_SERIES_START - 1;
  for (const row of rows) {
    const n = parseInvoiceNumber(row.invoice_number);
    if (n !== null && n > max) max = n;
  }
  return formatInvoiceNumber(max + 1);
}

/** True when the document already carries an invoice-series number. */
export function isInvoiceSeriesNumber(value) {
  const raw = String(value || '').trim();
  if (!raw || /^QT-/i.test(raw)) return false;
  return parseInvoiceNumber(raw) !== null;
}

/** Quotation series: QT-00001, QT-00002, … */
export async function nextQuotationNumber() {
  const rows = await all(
    `SELECT invoice_number FROM invoices WHERE doc_type = 'quotation'`
  );
  let max = 0;
  for (const row of rows) {
    const n = parseInvoiceNumber(row.invoice_number);
    if (n !== null && n > max) max = n;
  }
  return `QT-${String(max + 1).padStart(5, '0')}`;
}

export function calcTotals(items, taxRate = 5, discount = 0) {
  let laborTotal = 0;
  let partsTotal = 0;
  let vatTotal = 0;

  const defaultVat = Number(taxRate) || 5;

  const normalized = (items || []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const amount = Math.round(quantity * unitPrice * 100) / 100;
    const vatRate =
      item.vat_rate === undefined || item.vat_rate === null || item.vat_rate === ''
        ? defaultVat
        : Number(item.vat_rate) || 0;
    const vatAmount = Math.round(amount * (vatRate / 100) * 100) / 100;
    const itemType = item.item_type === 'part' ? 'part' : 'service';
    const unit = item.unit?.trim() || (itemType === 'part' ? 'Pcs' : 'Job');

    if (itemType === 'part') partsTotal += amount;
    else laborTotal += amount;
    vatTotal += vatAmount;

    return {
      description: item.description || '',
      item_type: itemType,
      unit,
      quantity,
      unit_price: unitPrice,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      amount,
    };
  });

  laborTotal = Math.round(laborTotal * 100) / 100;
  partsTotal = Math.round(partsTotal * 100) / 100;
  const subtotal = Math.round((laborTotal + partsTotal) * 100) / 100;
  const discountAmt = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const taxable = Math.round((subtotal - discountAmt) * 100) / 100;

  let taxAmount = Math.round(vatTotal * 100) / 100;
  if (subtotal > 0 && discountAmt > 0) {
    taxAmount = Math.round(taxable * (defaultVat / 100) * 100) / 100;
  }

  const total = Math.round((taxable + taxAmount) * 100) / 100;

  return {
    items: normalized,
    laborTotal,
    partsTotal,
    subtotal,
    discount: discountAmt,
    taxAmount,
    total,
    taxRate: defaultVat,
  };
}
