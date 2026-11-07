import { all, run } from './db.js';
import {
  formatInvoiceNumber,
  INVOICE_SERIES_START,
  parseInvoiceNumber,
} from './utils.js';

/**
 * Force the workshop invoice series onto existing rows:
 * oldest invoice becomes 00290, then 00291, 00292, ...
 */
export async function ensureInvoiceSeries() {
  const invoices = await all(
    'SELECT id, invoice_number FROM invoices ORDER BY id ASC'
  );
  if (invoices.length === 0) return 0;

  let changed = 0;
  let next = INVOICE_SERIES_START;

  for (const inv of invoices) {
    const desired = formatInvoiceNumber(next);
    if (String(inv.invoice_number) !== desired) {
      // Avoid unique collisions while shifting numbers
      const temp = `__tmp_${inv.id}_${desired}`;
      await run('UPDATE invoices SET invoice_number = ? WHERE id = ?', [
        temp,
        inv.id,
      ]);
      changed += 1;
    }
    next += 1;
  }

  next = INVOICE_SERIES_START;
  for (const inv of invoices) {
    const desired = formatInvoiceNumber(next);
    await run('UPDATE invoices SET invoice_number = ? WHERE id = ?', [
      desired,
      inv.id,
    ]);

    await run(
      `UPDATE sales
       SET description = ?
       WHERE invoice_id = ? AND category = 'invoice'`,
      [`Payment for ${desired}`, inv.id]
    );
    next += 1;
  }

  return changed || invoices.length;
}

export async function peekNextInvoiceNumber() {
  const rows = await all('SELECT invoice_number FROM invoices');
  let max = INVOICE_SERIES_START - 1;
  for (const row of rows) {
    const n = parseInvoiceNumber(row.invoice_number);
    if (n !== null && n > max) max = n;
  }
  return formatInvoiceNumber(max + 1);
}
