/** Official workshop series starts at 00290 (5 digits). */
const INVOICE_SERIES_START = 290;
const INVOICE_NUMBER_WIDTH = 5;

function formatInvoiceNumber(n) {
  return String(n).padStart(INVOICE_NUMBER_WIDTH, '0');
}

function parseInvoiceNumber(value) {
  const match = String(value || '').match(/(\d+)\s*$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return Number.isNaN(num) ? null : num;
}

export function nextInvoiceNumber(db) {
  const rows = db.prepare('SELECT invoice_number FROM invoices').all();
  let max = INVOICE_SERIES_START - 1;
  for (const row of rows) {
    const n = parseInvoiceNumber(row.invoice_number);
    if (n !== null && n > max) max = n;
  }
  return formatInvoiceNumber(max + 1);
}

/** Align existing invoices onto 00290, 00291, ... */
export function ensureInvoiceSeries(db) {
  const invoices = db
    .prepare('SELECT id, invoice_number FROM invoices ORDER BY id ASC')
    .all();
  if (invoices.length === 0) return 0;

  const tx = db.transaction((rows) => {
    for (const inv of rows) {
      db.prepare('UPDATE invoices SET invoice_number = ? WHERE id = ?').run(
        `__tmp_${inv.id}`,
        inv.id
      );
    }
    let n = INVOICE_SERIES_START;
    for (const inv of rows) {
      const number = formatInvoiceNumber(n);
      db.prepare('UPDATE invoices SET invoice_number = ? WHERE id = ?').run(
        number,
        inv.id
      );
      db.prepare(
        `UPDATE sales
         SET description = ?
         WHERE invoice_id = ? AND category = 'invoice'`
      ).run(`Payment for ${number}`, inv.id);
      n += 1;
    }
    return rows.length;
  });

  return tx(invoices);
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

  // If discount applied, scale VAT proportionally to taxable base
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
