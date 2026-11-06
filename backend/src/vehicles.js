import db from './db.js';

export function normalizePlate(plate) {
  if (!plate) return '';
  return String(plate)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Upsert a vehicle from invoice fields and return its id (or null if no usable identity).
 * Identity priority: plate number, then VIN.
 */
export function upsertVehicleFromInvoice({
  customer_id,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_plate,
  vehicle_vin,
  mileage,
}) {
  const plate = normalizePlate(vehicle_plate);
  const vin = vehicle_vin?.trim() || null;
  const make = vehicle_make?.trim() || null;
  const model = vehicle_model?.trim() || null;
  const year = vehicle_year?.trim() || null;
  const miles = mileage?.trim() || null;

  if (!plate && !vin && !make && !model) {
    return null;
  }

  let existing = null;
  if (plate) {
    existing = db
      .prepare(
        `SELECT * FROM vehicles
         WHERE UPPER(REPLACE(plate_number, ' ', '')) = UPPER(REPLACE(?, ' ', ''))`
      )
      .get(plate);
  }
  if (!existing && vin) {
    existing = db
      .prepare('SELECT * FROM vehicles WHERE UPPER(vin) = UPPER(?)')
      .get(vin);
  }

  if (existing) {
    db.prepare(
      `UPDATE vehicles SET
        customer_id = COALESCE(?, customer_id),
        make = COALESCE(?, make),
        model = COALESCE(?, model),
        year = COALESCE(?, year),
        plate_number = COALESCE(?, plate_number),
        vin = COALESCE(?, vin),
        mileage = COALESCE(?, mileage),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      customer_id || null,
      make,
      model,
      year,
      plate || null,
      vin,
      miles,
      existing.id
    );
    return existing.id;
  }

  const result = db
    .prepare(
      `INSERT INTO vehicles
       (customer_id, make, model, year, plate_number, vin, mileage)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      customer_id || null,
      make,
      model,
      year,
      plate || null,
      vin,
      miles
    );

  return result.lastInsertRowid;
}

export function backfillVehiclesFromInvoices() {
  ensureInvoiceVehicleColumn();

  const invoices = db
    .prepare(
      `SELECT id, customer_id, vehicle_make, vehicle_model, vehicle_year,
              vehicle_plate, vehicle_vin, mileage, vehicle_id
       FROM invoices
       WHERE vehicle_id IS NULL
         AND (
           (vehicle_plate IS NOT NULL AND TRIM(vehicle_plate) != '')
           OR (vehicle_vin IS NOT NULL AND TRIM(vehicle_vin) != '')
           OR (vehicle_make IS NOT NULL AND TRIM(vehicle_make) != '')
         )`
    )
    .all();

  const run = db.transaction((rows) => {
    let count = 0;
    for (const inv of rows) {
      const vehicleId = upsertVehicleFromInvoice(inv);
      if (vehicleId) {
        db.prepare('UPDATE invoices SET vehicle_id = ? WHERE id = ?').run(
          vehicleId,
          inv.id
        );
        count += 1;
      }
    }
    return count;
  });

  return run(invoices);
}

export function ensureInvoiceVehicleColumn() {
  const cols = db.prepare(`PRAGMA table_info(invoices)`).all().map((c) => c.name);
  if (!cols.includes('vehicle_id')) {
    db.exec('ALTER TABLE invoices ADD COLUMN vehicle_id INTEGER');
  }
}

export function getVehicleSummary(vehicleId) {
  return db
    .prepare(
      `SELECT
         COUNT(*) AS visit_count,
         COALESCE(SUM(total), 0) AS total_spent,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) AS paid_spent,
         COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0) AS outstanding,
         MIN(issue_date) AS first_visit,
         MAX(issue_date) AS last_visit
       FROM invoices
       WHERE vehicle_id = ?`
    )
    .get(vehicleId);
}
