import { initDb, get, run, withTransaction } from './db.js';

async function seedInventoryIfEmpty() {
  const invCount = (await get('SELECT COUNT(*)::int AS c FROM inventory_items'))
    .c;
  if (invCount > 0) return false;

  const parts = [
    [
      'PNT-WHT-01',
      'Basecoat White 1L',
      'paint',
      'L',
      12,
      4,
      85,
      140,
      'AutoColor UAE',
      'Paint Bay A',
      null,
    ],
    [
      'PNT-CLR-01',
      'Clearcoat 1L',
      'paint',
      'L',
      8,
      3,
      120,
      190,
      'AutoColor UAE',
      'Paint Bay A',
      null,
    ],
    [
      'CHM-DEG-01',
      'Panel Degreaser 5L',
      'chemicals',
      'Can',
      6,
      2,
      45,
      75,
      'DetailPro',
      'Chem Shelf',
      null,
    ],
    [
      'POL-DIA-01',
      'Diamond Polish Compound',
      'polish',
      'Bottle',
      10,
      3,
      55,
      95,
      'DetailPro',
      'Detail Bay',
      null,
    ],
    [
      'PRT-CLIP-01',
      'Bumper Clip Assortment',
      'parts',
      'Box',
      4,
      2,
      60,
      110,
      'AutoParts UAE',
      'Parts Rack 2',
      null,
    ],
    [
      'PRT-MIR-01',
      'Side Mirror Cover (Universal)',
      'parts',
      'Pcs',
      2,
      3,
      40,
      99,
      'AutoParts UAE',
      'Parts Rack 1',
      'Low stock sample',
    ],
    [
      'CNS-MASK-01',
      'Masking Tape 48mm',
      'consumables',
      'Roll',
      25,
      10,
      8,
      15,
      'Workshop Supply',
      'Consumables',
      null,
    ],
    [
      'CNS-SAND-01',
      'Sandpaper P800 Pack',
      'consumables',
      'Pack',
      15,
      5,
      18,
      30,
      'Workshop Supply',
      'Consumables',
      null,
    ],
  ];

  await withTransaction(async (client) => {
    for (const row of parts) {
      const result = await run(
        `INSERT INTO inventory_items
         (sku, name, category, unit, quantity_on_hand, reorder_level, cost_price, sell_price, supplier, location, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row,
        client
      );
      await run(
        `INSERT INTO inventory_movements
         (item_id, movement_type, quantity, unit_cost, balance_after, reference, notes, movement_date)
         VALUES (?, 'in', ?, ?, ?, 'Opening stock', 'Seed', CURRENT_DATE)`,
        [result.lastInsertRowid, row[4], row[6], row[4]],
        client
      );
    }
  });

  return true;
}

async function main() {
  await initDb();

  const count = (await get('SELECT COUNT(*)::int AS c FROM customers')).c;
  if (count > 0) {
    console.log('Database already has customer data. Skipping finance seed.');
    if (await seedInventoryIfEmpty()) {
      console.log('Sample inventory seeded successfully.');
    } else {
      console.log('Inventory already has data. Skipping inventory seed.');
    }
    process.exit(0);
  }

  await withTransaction(async (client) => {
    const c1 = (
      await run(
        `INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)`,
        [
          'Ahmed Al Mansoori',
          'ahmed@email.com',
          '+971 50 123 4567',
          'Al Quoz, Dubai',
        ],
        client
      )
    ).lastInsertRowid;

    const c2 = (
      await run(
        `INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)`,
        [
          'Sara Khan',
          'sara.khan@email.com',
          '+971 55 987 6543',
          'JLT, Dubai',
        ],
        client
      )
    ).lastInsertRowid;

    const c3 = (
      await run(
        `INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)`,
        [
          'Omar Hassan',
          'omar.h@email.com',
          '+971 52 444 2211',
          'Sharjah Industrial Area',
        ],
        client
      )
    ).lastInsertRowid;

    const inv1 = (
      await run(
        `INSERT INTO invoices (
          invoice_number, customer_id, vehicle_make, vehicle_model, vehicle_year,
          vehicle_plate, vehicle_vin, issue_date, due_date, status, notes,
          labor_total, parts_total, tax_rate, tax_amount, subtotal, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'INV-0001',
          c1,
          'Toyota',
          'Land Cruiser',
          '2021',
          'D-12345',
          'JTEBU11F7K5001234',
          '2026-10-15',
          '2026-10-30',
          'paid',
          'Full service and oil change',
          350,
          180,
          5,
          26.5,
          530,
          556.5,
        ],
        client
      )
    ).lastInsertRowid;

    await run(
      `INSERT INTO invoice_items
       (invoice_id, description, item_type, quantity, unit_price, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [inv1, 'Full synthetic oil change', 'service', 1, 250, 250],
      client
    );
    await run(
      `INSERT INTO invoice_items
       (invoice_id, description, item_type, quantity, unit_price, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [inv1, 'Brake inspection & adjustment', 'service', 1, 100, 100],
      client
    );
    await run(
      `INSERT INTO invoice_items
       (invoice_id, description, item_type, quantity, unit_price, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [inv1, 'Oil filter + air filter kit', 'part', 1, 180, 180],
      client
    );

    const inv2 = (
      await run(
        `INSERT INTO invoices (
          invoice_number, customer_id, vehicle_make, vehicle_model, vehicle_year,
          vehicle_plate, vehicle_vin, issue_date, due_date, status, notes,
          labor_total, parts_total, tax_rate, tax_amount, subtotal, total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'INV-0002',
          c2,
          'Nissan',
          'Patrol',
          '2019',
          'D-77821',
          null,
          '2026-10-28',
          '2026-11-12',
          'sent',
          'AC compressor replacement',
          450,
          820,
          5,
          63.5,
          1270,
          1333.5,
        ],
        client
      )
    ).lastInsertRowid;

    await run(
      `INSERT INTO invoice_items
       (invoice_id, description, item_type, quantity, unit_price, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [inv2, 'AC compressor replacement labor', 'service', 1, 450, 450],
      client
    );
    await run(
      `INSERT INTO invoice_items
       (invoice_id, description, item_type, quantity, unit_price, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [inv2, 'AC compressor unit', 'part', 1, 820, 820],
      client
    );

    await run(
      `INSERT INTO invoices (
        invoice_number, customer_id, vehicle_make, vehicle_model, vehicle_year,
        vehicle_plate, vehicle_vin, issue_date, due_date, status, notes,
        labor_total, parts_total, tax_rate, tax_amount, subtotal, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'INV-0003',
        c3,
        'Ford',
        'F-150',
        '2020',
        'SHJ-4412',
        null,
        '2026-11-01',
        '2026-11-15',
        'draft',
        'Pending parts arrival',
        0,
        0,
        5,
        0,
        0,
        0,
      ],
      client
    );

    await run(
      `INSERT INTO sales
       (invoice_id, sale_date, description, category, amount, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [inv1, '2026-10-15', 'Payment for INV-0001', 'invoice', 556.5, 'card', null],
      client
    );

    await run(
      `INSERT INTO sales
       (invoice_id, sale_date, description, category, amount, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [null, '2026-10-20', 'Walk-in tire balance', 'service', 80, 'cash', null],
      client
    );

    await run(
      `INSERT INTO expenses
       (expense_date, description, category, amount, vendor, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        '2026-10-05',
        'Monthly workshop rent',
        'rent',
        8500,
        'Al Quoz Properties',
        'bank',
        null,
      ],
      client
    );
    await run(
      `INSERT INTO expenses
       (expense_date, description, category, amount, vendor, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        '2026-10-12',
        'OEM oil filters stock',
        'parts',
        1450,
        'AutoParts UAE',
        'card',
        null,
      ],
      client
    );
    await run(
      `INSERT INTO expenses
       (expense_date, description, category, amount, vendor, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        '2026-10-18',
        'Electricity bill',
        'utilities',
        920,
        'DEWA',
        'bank',
        null,
      ],
      client
    );
  });

  console.log('Sample garage data seeded successfully.');
  if (await seedInventoryIfEmpty()) {
    console.log('Sample inventory seeded successfully.');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
