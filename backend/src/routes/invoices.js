import { Router } from 'express';
import { get, all, run, withTransaction } from '../db.js';
import { calcTotals, nextInvoiceNumber } from '../utils.js';
import { generateInvoicePdf } from '../generatePdf.js';
import { syncInvoiceSale } from '../syncInvoiceSale.js';
import { upsertVehicleFromInvoice } from '../vehicles.js';

const router = Router();

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
    const { status, q } = req.query;
    let sql = `
      SELECT i.*, c.name AS customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE 1=1
    `;
    const params = [];

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
    const invoiceNumber = await nextInvoiceNumber();
    const validStatus = [
      'draft',
      'sent',
      'paid',
      'overdue',
      'cancelled',
      'credit_note',
    ].includes(status)
      ? status
      : 'draft';

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
          parts_total, tax_rate, tax_amount, discount, subtotal, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

      return id;
    });

    res.status(201).json(await getInvoice(invoiceId));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getInvoice(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });

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
    const validStatus = [
      'draft',
      'sent',
      'paid',
      'overdue',
      'cancelled',
      'credit_note',
    ].includes(status)
      ? status
      : existing.status;

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
          updated_at = NOW()
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

export default router;
