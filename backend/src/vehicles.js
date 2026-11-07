import { get, all, run, withTransaction } from './db.js';

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
export async function upsertVehicleFromInvoice(
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
) {
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
    existing = await get(
      `SELECT * FROM vehicles
       WHERE UPPER(REPLACE(plate_number, ' ', '')) = UPPER(REPLACE(?, ' ', ''))`,
      [plate],
      client
    );
  }
  if (!existing && vin) {
    existing = await get(
      'SELECT * FROM vehicles WHERE UPPER(vin) = UPPER(?)',
      [vin],
      client
    );
  }

  if (existing) {
    await run(
      `UPDATE vehicles SET
        customer_id = COALESCE(?, customer_id),
        make = COALESCE(?, make),
        model = COALESCE(?, model),
        year = COALESCE(?, year),
        plate_number = COALESCE(?, plate_number),
        vin = COALESCE(?, vin),
        mileage = COALESCE(?, mileage),
        updated_at = NOW()
       WHERE id = ?`,
      [
        customer_id || null,
        make,
        model,
        year,
        plate || null,
        vin,
        miles,
        existing.id,
      ],
      client
    );
    return existing.id;
  }

  const result = await run(
    `INSERT INTO vehicles
     (customer_id, make, model, year, plate_number, vin, mileage)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [customer_id || null, make, model, year, plate || null, vin, miles],
    client
  );

  return result.lastInsertRowid;
}

export async function backfillVehiclesFromInvoices() {
  const invoices = await all(
    `SELECT id, customer_id, vehicle_make, vehicle_model, vehicle_year,
            vehicle_plate, vehicle_vin, mileage, vehicle_id
     FROM invoices
     WHERE vehicle_id IS NULL
       AND (
         (vehicle_plate IS NOT NULL AND TRIM(vehicle_plate) != '')
         OR (vehicle_vin IS NOT NULL AND TRIM(vehicle_vin) != '')
         OR (vehicle_make IS NOT NULL AND TRIM(vehicle_make) != '')
       )`
  );

  return withTransaction(async (client) => {
    let count = 0;
    for (const inv of invoices) {
      const vehicleId = await upsertVehicleFromInvoice(inv, client);
      if (vehicleId) {
        await run(
          'UPDATE invoices SET vehicle_id = ? WHERE id = ?',
          [vehicleId, inv.id],
          client
        );
        count += 1;
      }
    }
    return count;
  });
}

export async function getVehicleSummary(vehicleId) {
  return get(
    `SELECT
       COUNT(*)::int AS visit_count,
       COALESCE(SUM(total), 0)::float AS total_spent,
       COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)::float AS paid_spent,
       COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0)::float AS outstanding,
       MIN(issue_date) AS first_visit,
       MAX(issue_date) AS last_visit
     FROM invoices
     WHERE vehicle_id = ?`,
    [vehicleId]
  );
}
