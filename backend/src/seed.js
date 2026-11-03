import db from './db.js';

const count = db.prepare('SELECT COUNT(*) AS c FROM customers').get().c;
if (count > 0) {
  console.log('Database already has data. Skipping seed.');
  process.exit(0);
}

const seed = db.transaction(() => {
  const insertCustomer = db.prepare(
    `INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)`
  );

  const c1 = insertCustomer.run(
    'Ahmed Al Mansoori',
    'ahmed@email.com',
    '+971 50 123 4567',
    'Al Quoz, Dubai'
  ).lastInsertRowid;

  const c2 = insertCustomer.run(
    'Sara Khan',
    'sara.khan@email.com',
    '+971 55 987 6543',
    'JLT, Dubai'
  ).lastInsertRowid;

  const c3 = insertCustomer.run(
    'Omar Hassan',
    'omar.h@email.com',
    '+971 52 444 2211',
    'Sharjah Industrial Area'
  ).lastInsertRowid;

  const insertInvoice = db.prepare(
    `INSERT INTO invoices (
      invoice_number, customer_id, vehicle_make, vehicle_model, vehicle_year,
      vehicle_plate, vehicle_vin, issue_date, due_date, status, notes,
      labor_total, parts_total, tax_rate, tax_amount, subtotal, total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertItem = db.prepare(
    `INSERT INTO invoice_items
     (invoice_id, description, item_type, quantity, unit_price, amount)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const inv1 = insertInvoice.run(
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
    556.5
  ).lastInsertRowid;

  insertItem.run(inv1, 'Full synthetic oil change', 'service', 1, 250, 250);
  insertItem.run(inv1, 'Brake inspection & adjustment', 'service', 1, 100, 100);
  insertItem.run(inv1, 'Oil filter + air filter kit', 'part', 1, 180, 180);

  const inv2 = insertInvoice.run(
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
    1333.5
  ).lastInsertRowid;

  insertItem.run(inv2, 'AC compressor replacement labor', 'service', 1, 450, 450);
  insertItem.run(inv2, 'AC compressor unit', 'part', 1, 820, 820);

  insertInvoice.run(
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
    0
  );

  db.prepare(
    `INSERT INTO sales
     (invoice_id, sale_date, description, category, amount, payment_method, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    inv1,
    '2026-10-15',
    'Payment for INV-0001',
    'invoice',
    556.5,
    'card',
    null
  );

  db.prepare(
    `INSERT INTO sales
     (invoice_id, sale_date, description, category, amount, payment_method, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    null,
    '2026-10-20',
    'Walk-in tire balance',
    'service',
    80,
    'cash',
    null
  );

  const insertExpense = db.prepare(
    `INSERT INTO expenses
     (expense_date, description, category, amount, vendor, payment_method, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  insertExpense.run(
    '2026-10-05',
    'Monthly workshop rent',
    'rent',
    8500,
    'Al Quoz Properties',
    'bank',
    null
  );
  insertExpense.run(
    '2026-10-12',
    'OEM oil filters stock',
    'parts',
    1450,
    'AutoParts UAE',
    'card',
    null
  );
  insertExpense.run(
    '2026-10-18',
    'Electricity bill',
    'utilities',
    920,
    'DEWA',
    'bank',
    null
  );
});

seed();
console.log('Sample garage data seeded successfully.');
