import { get, all, run, withTransaction } from './db.js';

/**
 * Keep the sales ledger in sync with invoice payment status.
 * Paid invoices always create/update income; unpaid invoices remove linked sales.
 */
export async function syncInvoiceSale(
  { invoiceId, invoiceNumber, issueDate, status, total, notes = null },
  client
) {
  const existing = await get(
    'SELECT id FROM sales WHERE invoice_id = ?',
    [invoiceId],
    client
  );

  if (status === 'paid' && Number(total) > 0) {
    if (existing) {
      await run(
        `UPDATE sales SET
          sale_date = ?, description = ?, category = 'invoice',
          amount = ?, payment_method = 'invoice', notes = ?
         WHERE id = ?`,
        [
          issueDate,
          `Payment for ${invoiceNumber}`,
          Number(total),
          notes || null,
          existing.id,
        ],
        client
      );
    } else {
      await run(
        `INSERT INTO sales
         (invoice_id, sale_date, description, category, amount, payment_method, notes)
         VALUES (?, ?, ?, 'invoice', ?, 'invoice', ?)`,
        [
          invoiceId,
          issueDate,
          `Payment for ${invoiceNumber}`,
          Number(total),
          notes || null,
        ],
        client
      );
    }
    return;
  }

  if (existing) {
    await run('DELETE FROM sales WHERE id = ?', [existing.id], client);
  }
}

/** Backfill sales rows for any paid invoices missing a linked sale. */
export async function backfillInvoiceIncome() {
  const paid = await all(
    `SELECT i.id, i.invoice_number, i.issue_date, i.total, i.notes, i.status
     FROM invoices i
     WHERE i.status = 'paid' AND i.total > 0
       AND NOT EXISTS (SELECT 1 FROM sales s WHERE s.invoice_id = i.id)`
  );

  await withTransaction(async (client) => {
    for (const row of paid) {
      await syncInvoiceSale(
        {
          invoiceId: row.id,
          invoiceNumber: row.invoice_number,
          issueDate: row.issue_date,
          status: row.status,
          total: row.total,
          notes: row.notes,
        },
        client
      );
    }
  });

  return paid.length;
}
