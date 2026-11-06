import db from './db.js';

/**
 * Keep the sales ledger in sync with invoice payment status.
 * Paid invoices always create/update income; unpaid invoices remove linked sales.
 */
export function syncInvoiceSale({
  invoiceId,
  invoiceNumber,
  issueDate,
  status,
  total,
  notes = null,
}) {
  const existing = db
    .prepare('SELECT id FROM sales WHERE invoice_id = ?')
    .get(invoiceId);

  if (status === 'paid' && Number(total) > 0) {
    if (existing) {
      db.prepare(
        `UPDATE sales SET
          sale_date = ?, description = ?, category = 'invoice',
          amount = ?, payment_method = 'invoice', notes = ?
         WHERE id = ?`
      ).run(
        issueDate,
        `Payment for ${invoiceNumber}`,
        Number(total),
        notes || null,
        existing.id
      );
    } else {
      db.prepare(
        `INSERT INTO sales
         (invoice_id, sale_date, description, category, amount, payment_method, notes)
         VALUES (?, ?, ?, 'invoice', ?, 'invoice', ?)`
      ).run(
        invoiceId,
        issueDate,
        `Payment for ${invoiceNumber}`,
        Number(total),
        notes || null
      );
    }
    return;
  }

  if (existing) {
    db.prepare('DELETE FROM sales WHERE id = ?').run(existing.id);
  }
}

/** Backfill sales rows for any paid invoices missing a linked sale. */
export function backfillInvoiceIncome() {
  const paid = db
    .prepare(
      `SELECT i.id, i.invoice_number, i.issue_date, i.total, i.notes, i.status
       FROM invoices i
       WHERE i.status = 'paid' AND i.total > 0
         AND NOT EXISTS (SELECT 1 FROM sales s WHERE s.invoice_id = i.id)`
    )
    .all();

  const sync = db.transaction((rows) => {
    for (const row of rows) {
      syncInvoiceSale({
        invoiceId: row.id,
        invoiceNumber: row.invoice_number,
        issueDate: row.issue_date,
        status: row.status,
        total: row.total,
        notes: row.notes,
      });
    }
  });

  sync(paid);
  return paid.length;
}
