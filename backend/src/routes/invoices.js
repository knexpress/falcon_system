import { Router } from 'express';
import db from '../db.js';
import { calcTotals, nextInvoiceNumber } from '../utils.js';
import { generateInvoicePdf } from '../generatePdf.js';
import { syncInvoiceSale } from '../syncInvoiceSale.js';
import { upsertVehicleFromInvoice } from '../vehicles.js';

const router = Router();

function getInvoice(id) {
  const invoice = db
    .prepare(
      `SELECT i.*, c.name AS customer_name, c.email AS customer_email,
              c.phone AS customer_phone, c.address AS customer_address,
              c.trn AS customer_trn
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.id = ?`
    )
    .get(id);

  if (!invoice) return null;

  const items = db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id')
    .all(id);

  return { ...invoice, items };
}

router.get('/', (req, res) => {
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
      i.invoice_number LIKE ? OR
      c.name LIKE ? OR
      i.vehicle_plate LIKE ? OR
      i.vehicle_make LIKE ? OR
      i.vehicle_model LIKE ? OR
      i.job_order_no LIKE ?
    )`;
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }

  sql += ' ORDER BY i.issue_date DESC, i.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id/pdf', async (req, res) => {
  const invoice = getInvoice(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  try {
    const pdf = await generateInvoicePdf(invoice);
    const filename = `${invoice.invoice_number || 'invoice'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

router.get('/:id', (req, res) => {
  const invoice = getInvoice(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

router.post('/', (req, res) => {
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
    create_sale = false,
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

  const customer = db
    .prepare('SELECT id FROM customers WHERE id = ?')
    .get(customer_id);
  if (!customer) {
    return res.status(400).json({ error: 'Customer not found' });
  }

  // Keep customer TRN/phone/address in sync when provided from invoice form
  if (
    customer_trn !== undefined ||
    customer_phone !== undefined ||
    customer_address !== undefined
  ) {
    const current = db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .get(customer_id);
    db.prepare(
      `UPDATE customers SET trn = ?, phone = ?, address = ? WHERE id = ?`
    ).run(
      customer_trn !== undefined ? customer_trn || null : current.trn,
      customer_phone !== undefined ? customer_phone || null : current.phone,
      customer_address !== undefined
        ? customer_address || null
        : current.address,
      customer_id
    );
  }

  const totals = calcTotals(items, tax_rate, discount);
  const invoiceNumber = nextInvoiceNumber(db);
  const validStatus = ['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(
    status
  )
    ? status
    : 'draft';

  const create = db.transaction(() => {
    const vehicleId = upsertVehicleFromInvoice({
      customer_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_plate,
      vehicle_vin,
      mileage,
    });

    const result = db
      .prepare(
        `INSERT INTO invoices (
          invoice_number, customer_id, vehicle_id, vehicle_make, vehicle_model, vehicle_year,
          vehicle_plate, vehicle_vin, job_order_no, mileage, issue_date, due_date,
          status, notes, prepared_by, authorized_by, received_by, labor_total,
          parts_total, tax_rate, tax_amount, discount, subtotal, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
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
        totals.total
      );

    const invoiceId = result.lastInsertRowid;
    const insertItem = db.prepare(
      `INSERT INTO invoice_items
       (invoice_id, description, item_type, unit, quantity, unit_price, vat_rate, vat_amount, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of totals.items) {
      insertItem.run(
        invoiceId,
        item.description,
        item.item_type,
        item.unit,
        item.quantity,
        item.unit_price,
        item.vat_rate,
        item.vat_amount,
        item.amount
      );
    }

    syncInvoiceSale({
      invoiceId,
      invoiceNumber,
      issueDate: issue_date,
      status: validStatus,
      total: totals.total,
      notes,
    });

    return invoiceId;
  });

  const invoiceId = create();
  res.status(201).json(getInvoice(invoiceId));
});

router.put('/:id', (req, res) => {
  const existing = getInvoice(req.params.id);
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
    create_sale = false,
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

  const customer = db
    .prepare('SELECT id FROM customers WHERE id = ?')
    .get(customer_id);
  if (!customer) {
    return res.status(400).json({ error: 'Customer not found' });
  }

  if (
    customer_trn !== undefined ||
    customer_phone !== undefined ||
    customer_address !== undefined
  ) {
    const current = db
      .prepare('SELECT * FROM customers WHERE id = ?')
      .get(customer_id);
    db.prepare(
      `UPDATE customers SET trn = ?, phone = ?, address = ? WHERE id = ?`
    ).run(
      customer_trn !== undefined ? customer_trn || null : current.trn,
      customer_phone !== undefined ? customer_phone || null : current.phone,
      customer_address !== undefined
        ? customer_address || null
        : current.address,
      customer_id
    );
  }

  const totals = calcTotals(items, tax_rate, discount);
  const validStatus = ['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(
    status
  )
    ? status
    : existing.status;

  const update = db.transaction(() => {
    const vehicleId = upsertVehicleFromInvoice({
      customer_id,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_plate,
      vehicle_vin,
      mileage,
    });

    db.prepare(
      `UPDATE invoices SET
        customer_id = ?, vehicle_id = ?, vehicle_make = ?, vehicle_model = ?, vehicle_year = ?,
        vehicle_plate = ?, vehicle_vin = ?, job_order_no = ?, mileage = ?,
        issue_date = ?, due_date = ?, status = ?, notes = ?, prepared_by = ?,
        authorized_by = ?, received_by = ?, labor_total = ?, parts_total = ?,
        tax_rate = ?, tax_amount = ?, discount = ?, subtotal = ?, total = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
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
      req.params.id
    );

    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(
      req.params.id
    );

    const insertItem = db.prepare(
      `INSERT INTO invoice_items
       (invoice_id, description, item_type, unit, quantity, unit_price, vat_rate, vat_amount, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const item of totals.items) {
      insertItem.run(
        req.params.id,
        item.description,
        item.item_type,
        item.unit,
        item.quantity,
        item.unit_price,
        item.vat_rate,
        item.vat_amount,
        item.amount
      );
    }

    syncInvoiceSale({
      invoiceId: Number(req.params.id),
      invoiceNumber: existing.invoice_number,
      issueDate: issue_date,
      status: validStatus,
      total: totals.total,
      notes,
    });
  });

  update();
  res.json(getInvoice(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  res.json({ success: true });
});

export default router;
