import { Router } from 'express';
import { get, all, run } from '../db.js';
import {
  getVehicleSummary,
  normalizePlate,
  upsertVehicleFromInvoice,
} from '../vehicles.js';

const router = Router();

async function getVehicle(id) {
  return get(
    `SELECT v.*, c.name AS customer_name, c.phone AS customer_phone,
            c.email AS customer_email
     FROM vehicles v
     LEFT JOIN customers c ON c.id = v.customer_id
     WHERE v.id = ?`,
    [id]
  );
}

router.get('/', async (req, res, next) => {
  try {
    const { q, customer_id } = req.query;
    let sql = `
      SELECT v.*,
             c.name AS customer_name,
             c.phone AS customer_phone,
             (SELECT COUNT(*)::int FROM invoices i WHERE i.vehicle_id = v.id) AS visit_count,
             (SELECT COALESCE(SUM(total), 0)::float FROM invoices i WHERE i.vehicle_id = v.id) AS total_spent,
             (SELECT COALESCE(SUM(total), 0)::float FROM invoices i WHERE i.vehicle_id = v.id AND i.status = 'paid') AS paid_spent,
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
        v.plate_number ILIKE ? OR
        v.make ILIKE ? OR
        v.model ILIKE ? OR
        v.vin ILIKE ? OR
        c.name ILIKE ?
      )`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }

    sql +=
      ' ORDER BY CASE WHEN last_visit IS NULL THEN 1 ELSE 0 END, last_visit DESC, v.updated_at DESC, v.id DESC';
    res.json(await all(sql, params));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const vehicle = await getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const summary = await getVehicleSummary(req.params.id);

    const invoices = await all(
      `SELECT i.id, i.invoice_number, i.issue_date, i.status, i.total,
              i.job_order_no, i.mileage, i.notes, c.name AS customer_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       WHERE i.vehicle_id = ?
       ORDER BY i.issue_date DESC, i.id DESC`,
      [req.params.id]
    );

    const services = await all(
      `SELECT ii.description, ii.item_type, ii.unit, ii.quantity,
              ii.unit_price, ii.amount, ii.vat_amount,
              i.id AS invoice_id, i.invoice_number, i.issue_date, i.status
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.vehicle_id = ?
       ORDER BY i.issue_date DESC, ii.id ASC`,
      [req.params.id]
    );

    res.json({
      ...vehicle,
      summary,
      invoices,
      services,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
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

    const id = await upsertVehicleFromInvoice({
      customer_id,
      vehicle_make: make,
      vehicle_model: model,
      vehicle_year: year,
      vehicle_plate: plate_number,
      vehicle_vin: vin,
      mileage,
    });

    if (notes?.trim()) {
      await run(
        `UPDATE vehicles SET notes = ?, updated_at = NOW() WHERE id = ?`,
        [notes.trim(), id]
      );
    }

    res.status(201).json(await getVehicle(id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getVehicle(req.params.id);
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

    await run(
      `UPDATE vehicles SET
        customer_id = ?, make = ?, model = ?, year = ?,
        plate_number = ?, vin = ?, mileage = ?, notes = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        customer_id || null,
        make?.trim() || null,
        model?.trim() || null,
        year?.trim() || null,
        normalizePlate(plate_number) || null,
        vin?.trim() || null,
        mileage?.trim() || null,
        notes?.trim() || null,
        req.params.id,
      ]
    );

    res.json(await getVehicle(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await getVehicle(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    await run('UPDATE invoices SET vehicle_id = NULL WHERE vehicle_id = ?', [
      req.params.id,
    ]);
    await run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
