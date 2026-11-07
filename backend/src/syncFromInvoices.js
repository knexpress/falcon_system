import { all, get, run, withTransaction } from './db.js';
import { upsertVehicleFromInvoice } from './vehicles.js';

/**
 * Ensure every invoice has a customer row (repair orphaned customer_ids)
 * and a linked vehicle derived from plate/make/model/VIN on the invoice.
 */
export async function syncCustomersAndVehiclesFromInvoices() {
  return withTransaction(async (client) => {
    let customersFixed = 0;
    let vehiclesLinked = 0;

    const invoices = await all(
      `SELECT id, customer_id, vehicle_id, vehicle_make, vehicle_model, vehicle_year,
              vehicle_plate, vehicle_vin, mileage,
              (SELECT name FROM customers c WHERE c.id = invoices.customer_id) AS customer_name,
              (SELECT phone FROM customers c WHERE c.id = invoices.customer_id) AS customer_phone,
              (SELECT email FROM customers c WHERE c.id = invoices.customer_id) AS customer_email,
              (SELECT address FROM customers c WHERE c.id = invoices.customer_id) AS customer_address,
              (SELECT trn FROM customers c WHERE c.id = invoices.customer_id) AS customer_trn
       FROM invoices
       ORDER BY id ASC`,
      [],
      client
    );

    for (const inv of invoices) {
      let customerId = inv.customer_id;

      // If customer_id points nowhere, recreate a minimal customer
      if (customerId) {
        const exists = await get(
          'SELECT id FROM customers WHERE id = ?',
          [customerId],
          client
        );
        if (!exists) {
          customerId = null;
        }
      }

      if (!customerId) {
        const name = inv.customer_name?.trim() || `Customer for invoice ${inv.id}`;
        const created = await run(
          `INSERT INTO customers (name, email, phone, address, trn)
           VALUES (?, ?, ?, ?, ?)`,
          [
            name,
            inv.customer_email || null,
            inv.customer_phone || null,
            inv.customer_address || null,
            inv.customer_trn || null,
          ],
          client
        );
        customerId = created.lastInsertRowid;
        await run(
          'UPDATE invoices SET customer_id = ? WHERE id = ?',
          [customerId, inv.id],
          client
        );
        customersFixed += 1;
      }

      const hasVehicleInfo =
        (inv.vehicle_plate && String(inv.vehicle_plate).trim()) ||
        (inv.vehicle_vin && String(inv.vehicle_vin).trim()) ||
        (inv.vehicle_make && String(inv.vehicle_make).trim()) ||
        (inv.vehicle_model && String(inv.vehicle_model).trim());

      if (!hasVehicleInfo) continue;

      // Re-link if missing vehicle_id, or vehicle row was deleted
      let needsLink = !inv.vehicle_id;
      if (inv.vehicle_id) {
        const vehicleExists = await get(
          'SELECT id FROM vehicles WHERE id = ?',
          [inv.vehicle_id],
          client
        );
        if (!vehicleExists) needsLink = true;
      }

      if (!needsLink) {
        // Still refresh vehicle details from invoice fields
        await upsertVehicleFromInvoice(
          {
            customer_id: customerId,
            vehicle_make: inv.vehicle_make,
            vehicle_model: inv.vehicle_model,
            vehicle_year: inv.vehicle_year,
            vehicle_plate: inv.vehicle_plate,
            vehicle_vin: inv.vehicle_vin,
            mileage: inv.mileage,
          },
          client
        );
        continue;
      }

      const vehicleId = await upsertVehicleFromInvoice(
        {
          customer_id: customerId,
          vehicle_make: inv.vehicle_make,
          vehicle_model: inv.vehicle_model,
          vehicle_year: inv.vehicle_year,
          vehicle_plate: inv.vehicle_plate,
          vehicle_vin: inv.vehicle_vin,
          mileage: inv.mileage,
        },
        client
      );

      if (vehicleId) {
        await run(
          'UPDATE invoices SET vehicle_id = ?, customer_id = ? WHERE id = ?',
          [vehicleId, customerId, inv.id],
          client
        );
        vehiclesLinked += 1;
      }
    }

    return { customersFixed, vehiclesLinked };
  });
}
