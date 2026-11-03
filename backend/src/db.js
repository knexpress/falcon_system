import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'garage.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    trn TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    vehicle_plate TEXT,
    vehicle_vin TEXT,
    job_order_no TEXT,
    mileage TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    prepared_by TEXT,
    labor_total REAL NOT NULL DEFAULT 0,
    parts_total REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 5,
    tax_amount REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'service',
    unit TEXT NOT NULL DEFAULT 'Job',
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    vat_rate REAL NOT NULL DEFAULT 5,
    vat_amount REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    sale_date TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'service',
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'parts',
    amount REAL NOT NULL,
    vendor TEXT,
    payment_method TEXT DEFAULT 'cash',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('customers', 'trn', 'TEXT');
ensureColumn('invoices', 'job_order_no', 'TEXT');
ensureColumn('invoices', 'mileage', 'TEXT');
ensureColumn('invoices', 'discount', 'REAL NOT NULL DEFAULT 0');
ensureColumn('invoices', 'prepared_by', 'TEXT');
ensureColumn('invoices', 'authorized_by', 'TEXT');
ensureColumn('invoices', 'received_by', 'TEXT');
ensureColumn('invoice_items', 'unit', "TEXT NOT NULL DEFAULT 'Job'");
ensureColumn('invoice_items', 'vat_rate', 'REAL NOT NULL DEFAULT 5');
ensureColumn('invoice_items', 'vat_amount', 'REAL NOT NULL DEFAULT 0');

export default db;
