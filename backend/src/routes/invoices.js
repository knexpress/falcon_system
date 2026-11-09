import { Router } from 'express';
import { get, all, run, withTransaction } from '../db.js';
import {
  calcTotals,
  nextInvoiceNumber,
  nextQuotationNumber,
} from '../utils.js';
import { generateInvoicePdf } from '../generatePdf.js';
import { syncInvoiceSale } from '../syncInvoiceSale.js';
import { upsertVehicleFromInvoice } from '../vehicles.js';
import { getRequestUser, isOwner, isStaff } from '../requestUser.js';
import {
  notifyStaffApproved,
  notifyStaffChangesRequested,
} from '../notify.js';

const router = Router();

const BASE_STATUSES = [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
  'credit_note',
  'debit_note',
];

const ALL_STATUSES = [
  ...BASE_STATUSES,
  'pending_approval',
  'approved',
  'changes_requested',
  'rejected',
];

function normalizeRequestedStatus(status) {
  return BASE_STATUSES.includes(status) ? status : 'sent';
}

async function getInvoice(id, client) {
  const invoice = await get(
    `SELECT i.*, c.name AS customer_name, c.email AS customer_email,
            c.phone AS customer_phone, c.address AS customer_address,
            c.trn AS customer_trn
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     WHERE i.id = ?`,
    [id],
    client
  );

  if (!invoice) return null;

  const items = await all(
    'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id',
    [id],
    client
  );

  return { ...invoice, items };
}

router.get('/', async (req, res, next) => {
  try {
    const { status, q, doc_type: docTypeRaw } = req.query;
    const docType = String(docTypeRaw || 'invoice').toLowerCase();
    let sql = `
      SELECT i.*, c.name AS customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (docType === 'quotation') {
      sql += ` AND i.doc_type = 'quotation'`;
    } else if (docType === 'all') {
      // no doc_type filter
    } else if (docType === 'invoice_board') {
      // Invoices page: real invoices + open quotations ready to convert
      sql += ` AND (
        COALESCE(i.doc_type, 'invoice') = 'invoice'
        OR (
          i.doc_type = 'quotation'
          AND COALESCE(i.status, '') NOT IN ('cancelled')
        )
      )`;
    } else {
      sql += ` AND COALESCE(i.doc_type, 'invoice') = 'invoice'`;
    }

    if (status) {
      sql += ' AND i.status = ?';
      params.push(status);
    }

    if (q) {
      sql += ` AND (
        i.invoice_number ILIKE ? OR
        c.name ILIKE ? OR
        i.vehicle_plate ILIKE ? OR
        i.vehicle_make ILIKE ? OR
        i.vehicle_model ILIKE ? OR
        i.job_order_no ILIKE ?
      )`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }

    sql += ' ORDER BY i.issue_date DESC, i.id DESC';
    res.json(await all(sql, params));
  } catch (err) {
    next(err);
  }
});

router.get('/pending-approvals', async (req, res, next) => {
  try {
    const user = await getRequestUser(req);
    if (!isOwner(user)) {
      return res.status(403).json({
        error: 'Only the owner can view the approvals queue.',
      });
    }

    const rows = await all(
      `SELECT i.*, c.name AS customer_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.doc_type = 'quotation' AND i.status = 'pending_approval'
       ORDER BY i.created_at ASC, i.id ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const invoice = await getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const pdf = await generateInvoicePdf(invoice);
    const filename = `${invoice.invoice_number || 'invoice'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    const {
      customer_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_plate,
      vehicle_vin,
      job_order_no,
      mileage,
      issue_date,
      due_date,
      status = 'draft',
      notes,
      prepared_by,
      authorized_by,
      received_by,
      tax_rate = 5,
      discount = 0,
      items = [],
      customer_trn,
      customer_phone,
      customer_address,
      doc_type: bodyDocType,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' });
    }
    if (!issue_date) {
      return res.status(400).json({ error: 'Issue date is required' });
    }

    const customer = await get('SELECT id FROM customers WHERE id = ?', [
      customer_id,
    ]);
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    if (
      customer_trn !== undefined ||
      customer_phone !== undefined ||
      customer_address !== undefined
    ) {
      const current = await get('SELECT * FROM customers WHERE id = ?', [
        customer_id,
      ]);
      await run(
        `UPDATE customers SET trn = ?, phone = ?, address = ? WHERE id = ?`,
        [
          customer_trn !== undefined ? customer_trn || null : current.trn,
          customer_phone !== undefined ? customer_phone || null : current.phone,
          customer_address !== undefined
            ? customer_address || null
            : current.address,
          customer_id,
        ]
      );
    }

    const totals = calcTotals(items, tax_rate, discount);
    // Respect explicit doc_type. Staff default to quotation; owners may create either.
    const explicitType = String(bodyDocType || '').toLowerCase();
    let wantsQuotation;
    if (explicitType === 'quotation') {
      wantsQuotation = true;
    } else if (explicitType === 'invoice') {
      wantsQuotation = false;
    } else {
      wantsQuotation = isStaff(actor) && !isOwner(actor);
    }
    const docType = wantsQuotation ? 'quotation' : 'invoice';
    const invoiceNumber = wantsQuotation
      ? await nextQuotationNumber()
      : await nextInvoiceNumber();
    const requestedStatus = normalizeRequestedStatus(status);
    // No approval queue — quotations save as a normal desk status (usually sent)
    const validStatus = wantsQuotation
      ? requestedStatus
      : ALL_STATUSES.includes(status)
        ? status
        : 'draft';
    const journalStatus = wantsQuotation ? 'draft' : 'posted';
    const createdBy =
      actor?.username ||
      String(req.headers['x-falcon-user'] || '').trim() ||
      null;
    const preparedName =
      prepared_by || actor?.name || createdBy || null;

    const invoiceId = await withTransaction(async (client) => {
      const vehicleId = await upsertVehicleFromInvoice(
        {
          customer_id,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_plate,
          vehicle_vin,
          mileage,
        },
        client
      );

      const result = await run(
        `INSERT INTO invoices (
          invoice_number, customer_id, vehicle_id, vehicle_make, vehicle_model, vehicle_year,
          vehicle_plate, vehicle_vin, job_order_no, mileage, issue_date, due_date,
          status, notes, prepared_by, authorized_by, received_by, labor_total,
          parts_total, tax_rate, tax_amount, discount, subtotal, total,
          created_by, requested_status, doc_type, journal_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceNumber,
          customer_id,
          vehicleId,
          vehicle_make || null,
          vehicle_model || null,
          vehicle_year || null,
          vehicle_plate || null,
          vehicle_vin || null,
          job_order_no || null,
          mileage || null,
          issue_date,
          due_date || null,
          validStatus,
          notes || null,
          preparedName,
          authorized_by || null,
          received_by || null,
          totals.laborTotal,
          totals.partsTotal,
          totals.taxRate,
          totals.taxAmount,
          totals.discount,
          totals.subtotal,
          totals.total,
          createdBy,
          null,
          docType,
          journalStatus,
        ],
        client
      );

      const id = result.lastInsertRowid;

      for (const item of totals.items) {
        await run(
          `INSERT INTO invoice_items
           (invoice_id, description, item_type, unit, quantity, unit_price, vat_rate, vat_amount, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            item.description,
            item.item_type,
            item.unit,
            item.quantity,
            item.unit_price,
            item.vat_rate,
            item.vat_amount,
            item.amount,
          ],
          client
        );
      }

      if (docType === 'invoice') {
        await syncInvoiceSale(
          {
            invoiceId: id,
            invoiceNumber,
            issueDate: issue_date,
            status: validStatus,
            total: totals.total,
            notes,
          },
          client
        );
      }

      return id;
    });

    const created = await getInvoice(invoiceId);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getInvoice(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    const actor = await getRequestUser(req);

    const {
      customer_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_plate,
      vehicle_vin,
      job_order_no,
      mileage,
      issue_date,
      due_date,
      status,
      notes,
      prepared_by,
      authorized_by,
      received_by,
      tax_rate = 5,
      discount = 0,
      items = [],
      customer_trn,
      customer_phone,
      customer_address,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' });
    }
    if (!issue_date) {
      return res.status(400).json({ error: 'Issue date is required' });
    }

    const customer = await get('SELECT id FROM customers WHERE id = ?', [
      customer_id,
    ]);
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    if (
      customer_trn !== undefined ||
      customer_phone !== undefined ||
      customer_address !== undefined
    ) {
      const current = await get('SELECT * FROM customers WHERE id = ?', [
        customer_id,
      ]);
      await run(
        `UPDATE customers SET trn = ?, phone = ?, address = ? WHERE id = ?`,
        [
          customer_trn !== undefined ? customer_trn || null : current.trn,
          customer_phone !== undefined ? customer_phone || null : current.phone,
          customer_address !== undefined
            ? customer_address || null
            : current.address,
          customer_id,
        ]
      );
    }

    const totals = calcTotals(items, tax_rate, discount);
    // Keep quotation/invoice status as a normal desk status (no approval queue)
    let validStatus = ALL_STATUSES.includes(status)
      ? status
      : existing.status;
    if (
      existing.doc_type === 'quotation' &&
      ['pending_approval', 'changes_requested', 'approved'].includes(
        String(validStatus)
      )
    ) {
      validStatus = normalizeRequestedStatus(
        status || existing.requested_status || 'sent'
      );
    }
    const nextRequested = null;

    await withTransaction(async (client) => {
      const vehicleId = await upsertVehicleFromInvoice(
        {
          customer_id,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_plate,
          vehicle_vin,
          mileage,
        },
        client
      );

      await run(
        `UPDATE invoices SET
          customer_id = ?, vehicle_id = ?, vehicle_make = ?, vehicle_model = ?, vehicle_year = ?,
          vehicle_plate = ?, vehicle_vin = ?, job_order_no = ?, mileage = ?,
          issue_date = ?, due_date = ?, status = ?, notes = ?, prepared_by = ?,
          authorized_by = ?, received_by = ?, labor_total = ?, parts_total = ?,
          tax_rate = ?, tax_amount = ?, discount = ?, subtotal = ?, total = ?,
          requested_status = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          customer_id,
          vehicleId,
          vehicle_make || null,
          vehicle_model || null,
          vehicle_year || null,
          vehicle_plate || null,
          vehicle_vin || null,
          job_order_no || null,
          mileage || null,
          issue_date,
          due_date || null,
          validStatus,
          notes || null,
          prepared_by || null,
          authorized_by || null,
          received_by || null,
          totals.laborTotal,
          totals.partsTotal,
          totals.taxRate,
          totals.taxAmount,
          totals.discount,
          totals.subtotal,
          totals.total,
          nextRequested,
          req.params.id,
        ],
        client
      );

      await run('DELETE FROM invoice_items WHERE invoice_id = ?', [
        req.params.id,
      ], client);

      for (const item of totals.items) {
        await run(
          `INSERT INTO invoice_items
           (invoice_id, description, item_type, unit, quantity, unit_price, vat_rate, vat_amount, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.params.id,
            item.description,
            item.item_type,
            item.unit,
            item.quantity,
            item.unit_price,
            item.vat_rate,
            item.vat_amount,
            item.amount,
          ],
          client
        );
      }

      await syncInvoiceSale(
        {
          invoiceId: Number(req.params.id),
          invoiceNumber: existing.invoice_number,
          issueDate: issue_date,
          status: validStatus,
          total: totals.total,
          notes,
        },
        client
      );
    });

    const updated = await getInvoice(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    if (!isOwner(actor)) {
      return res.status(403).json({
        error: 'Only Cedrick (owner) can approve quotations.',
      });
    }

    const existing = await getInvoice(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });
    if (existing.doc_type !== 'quotation') {
      return res.status(400).json({ error: 'Only quotations can be approved.' });
    }
    if (existing.status !== 'pending_approval') {
      return res.status(400).json({
        error: 'Only quotations waiting for approval can be approved.',
      });
    }

    const note = String(req.body?.note || '').trim() || null;

    await run(
      `UPDATE invoices SET
        status = 'approved',
        approved_by = ?,
        approved_at = NOW(),
        approval_note = ?,
        authorized_by = COALESCE(authorized_by, ?),
        journal_status = 'draft',
        updated_at = NOW()
       WHERE id = ?`,
      [actor.username, note, actor.name, req.params.id]
    );

    const approved = await getInvoice(req.params.id);
    void notifyStaffApproved(approved);
    res.json(approved);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/send-back', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    if (!isOwner(actor)) {
      return res.status(403).json({
        error: 'Only Cedrick (owner) can send quotations back.',
      });
    }

    const existing = await getInvoice(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });
    if (existing.doc_type !== 'quotation') {
      return res
        .status(400)
        .json({ error: 'Only quotations can be sent back.' });
    }
    if (existing.status !== 'pending_approval') {
      return res.status(400).json({
        error: 'Only quotations waiting for approval can be sent back.',
      });
    }

    const note = String(req.body?.note || '').trim();
    if (!note) {
      return res.status(400).json({
        error: 'A note is required so Mariel / Arnie know what to change.',
      });
    }

    await run(
      `UPDATE invoices SET
        status = 'changes_requested',
        approved_by = ?,
        approved_at = NOW(),
        approval_note = ?,
        journal_status = 'draft',
        updated_at = NOW()
       WHERE id = ?`,
      [actor.username, note, req.params.id]
    );

    const sentBack = await getInvoice(req.params.id);
    void notifyStaffChangesRequested(sentBack);
    res.json(sentBack);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/generate-invoice', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    const existing = await getInvoice(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });
    if (existing.doc_type !== 'quotation') {
      return res.status(400).json({
        error: 'Only quotations can generate an invoice.',
      });
    }
    if (String(existing.status).toLowerCase() === 'cancelled') {
      return res.status(400).json({
        error: 'Cancelled quotations cannot generate an invoice.',
      });
    }

    const nextStatus = normalizeRequestedStatus(
      req.body?.status || existing.requested_status || existing.status || 'sent'
    );
    const invoiceNumber = await nextInvoiceNumber();

    await withTransaction(async (client) => {
      await run(
        `UPDATE invoices SET
          doc_type = 'invoice',
          invoice_number = ?,
          status = ?,
          journal_status = 'posted',
          authorized_by = COALESCE(authorized_by, ?),
          updated_at = NOW()
         WHERE id = ?`,
        [
          invoiceNumber,
          nextStatus,
          actor?.name || existing.authorized_by || null,
          req.params.id,
        ],
        client
      );

      await syncInvoiceSale(
        {
          invoiceId: Number(req.params.id),
          invoiceNumber,
          issueDate: existing.issue_date,
          status: nextStatus,
          total: existing.total,
          notes: existing.notes,
        },
        client
      );
    });

    res.json(await getInvoice(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM invoices WHERE id = ?', [
      req.params.id,
    ]);
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (existing.doc_type === 'quotation') {
      return res.status(400).json({
        error: 'Quotations cannot be converted to a credit note.',
      });
    }
    if (existing.status === 'credit_note') {
      return res.status(400).json({
        error: 'This invoice is already a credit note and cannot be removed',
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const creditNote = `Credit note issued on ${today} (original status: ${existing.status}).`;
    const notes = existing.notes?.trim()
      ? `${existing.notes.trim()}\n${creditNote}`
      : creditNote;

    await withTransaction(async (client) => {
      await run(
        `UPDATE invoices SET
          status = 'credit_note',
          notes = ?,
          journal_status = 'posted',
          updated_at = NOW()
         WHERE id = ?`,
        [notes, req.params.id],
        client
      );

      await syncInvoiceSale(
        {
          invoiceId: Number(req.params.id),
          invoiceNumber: existing.invoice_number,
          issueDate: existing.issue_date,
          status: 'credit_note',
          total: existing.total,
          notes,
        },
        client
      );
    });

    res.json(await getInvoice(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/debit-note', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM invoices WHERE id = ?', [
      req.params.id,
    ]);
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    if (existing.doc_type === 'quotation') {
      return res.status(400).json({
        error: 'Quotations cannot be converted to a debit note.',
      });
    }
    if (existing.status === 'debit_note') {
      return res.status(400).json({
        error: 'This invoice is already a debit note.',
      });
    }
    if (existing.status === 'credit_note') {
      return res.status(400).json({
        error: 'A credit note cannot be converted to a debit note.',
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const debitNote = `Debit note issued on ${today} (original status: ${existing.status}).`;
    const notes = existing.notes?.trim()
      ? `${existing.notes.trim()}\n${debitNote}`
      : debitNote;

    await withTransaction(async (client) => {
      await run(
        `UPDATE invoices SET
          status = 'debit_note',
          notes = ?,
          journal_status = 'posted',
          updated_at = NOW()
         WHERE id = ?`,
        [notes, req.params.id],
        client
      );

      await syncInvoiceSale(
        {
          invoiceId: Number(req.params.id),
          invoiceNumber: existing.invoice_number,
          issueDate: existing.issue_date,
          status: 'debit_note',
          total: existing.total,
          notes,
        },
        client
      );
    });

    res.json(await getInvoice(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
