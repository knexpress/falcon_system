import { Router } from 'express';
import db from '../db.js';
import {
  getVehicleSummary,
  normalizePlate,
  upsertVehicleFromInvoice,
} from '../vehicles.js';

const router = Router();

function getVehicle(id) {
  return db
    .prepare(
      `SELECT v.*, c.name AS customer_name, c.phone AS customer_phone,
              c.email AS customer_email
       FROM vehicles v
       LEFT JOIN customers c ON c.id = v.customer_id
       WHERE v.id = ?`
    )
    .get(id);
}

router.get('/', (req, res) => {
  const { q, customer_id } = req.query;
  let sql = `
    SELECT v.*,
           c.name AS customer_name,
           c.phone AS customer_phone,
           (SELECT COUNT(*) FROM invoices i WHERE i.vehicle_id = v.id) AS visit_count,
           (SELECT COALESCE(SUM(total), 0) FROM invoices i WHERE i.vehicle_id = v.id) AS total_spent,
           (SELECT COALESCE(SUM(total), 0) FROM invoices i WHERE i.vehicle_id = v.id AND i.status = 'paid') AS paid_spent,
           (SELECT MAX(issue_date) FROM invoices i WHERE i.vehicle_id = v.id) AS last_visit
    FROM vehicles v
    LEFT JOIN customers c ON c.id = v.customer_id
    WHERE 1=1
  `;
  const params = [];

  if (customer_id) {
    sql += ' AND v.customer_id = ?';
    params.push(customer_id);
  }

  if (q) {
    sql += ` AND (
      v.plate_number LIKE ? OR
      v.make LIKE ? OR
      v.model LIKE ? OR
      v.vin LIKE ? OR
      c.name LIKE ?
    )`;
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }

  sql +=
    ' ORDER BY CASE WHEN last_visit IS NULL THEN 1 ELSE 0 END, last_visit DESC, v.updated_at DESC, v.id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const vehicle = getVehicle(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const summary = getVehicleSummary(req.params.id);

  const invoices = db
    .prepare(
      `SELECT i.id, i.invoice_number, i.issue_date, i.status, i.total,
              i.job_order_no, i.mileage, i.notes, c.name AS customer_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.vehicle_id = ?
       ORDER BY i.issue_date DESC, i.id DESC`
    )
    .all(req.params.id);

  const services = db
    .prepare(
      `SELECT ii.description, ii.item_type, ii.unit, ii.quantity,
              ii.unit_price, ii.amount, ii.vat_amount,
              i.id AS invoice_id, i.invoice_number, i.issue_date, i.status
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.vehicle_id = ?
       ORDER BY i.issue_date DESC, ii.id ASC`
    )
    .all(req.params.id);

  res.json({
    ...vehicle,
    summary,
    invoices,
    services,
  });
});

router.post('/', (req, res) => {
  const {
    customer_id,
    make,
    model,
    year,
    plate_number,
    vin,
    mileage,
    notes,
  } = req.body;

  if (!plate_number?.trim() && !vin?.trim() && !make?.trim()) {
    return res
      .status(400)
      .json({ error: 'Provide at least plate, VIN, or make' });
  }

  const id = upsertVehicleFromInvoice({
    customer_id,
    vehicle_make: make,
    vehicle_model: model,
    vehicle_year: year,
    vehicle_plate: plate_number,
    vehicle_vin: vin,
    mileage,
  });

  if (notes?.trim()) {
    db.prepare(
      `UPDATE vehicles SET notes = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(notes.trim(), id);
  }

  res.status(201).json(getVehicle(id));
});

router.put('/:id', (req, res) => {
  const existing = getVehicle(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  const {
    customer_id,
    make,
    model,
    year,
    plate_number,
    vin,
    mileage,
    notes,
  } = req.body;

  db.prepare(
    `UPDATE vehicles SET
      customer_id = ?, make = ?, model = ?, year = ?,
      plate_number = ?, vin = ?, mileage = ?, notes = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    customer_id || null,
    make?.trim() || null,
    model?.trim() || null,
    year?.trim() || null,
    normalizePlate(plate_number) || null,
    vin?.trim() || null,
    mileage?.trim() || null,
    notes?.trim() || null,
    req.params.id
  );

  res.json(getVehicle(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = getVehicle(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  db.prepare('UPDATE invoices SET vehicle_id = NULL WHERE vehicle_id = ?').run(
    req.params.id
  );
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
