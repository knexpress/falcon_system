import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required. Set it in backend/.env or your host environment.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false },
});

/** Convert ? placeholders to $1, $2, ... and SQLite date helpers to Postgres. */
export function sql(text) {
  let i = 0;
  return text
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/COLLATE NOCASE/gi, '')
    .replace(/\?/g, () => `$${++i}`);
}

async function query(text, params = [], client) {
  const runner = client || pool;
  return runner.query(sql(text), params);
}

export async function get(text, params = [], client) {
  const result = await query(text, params, client);
  return result.rows[0] || null;
}

export async function all(text, params = [], client) {
  const result = await query(text, params, client);
  return result.rows;
}

export async function run(text, params = [], client) {
  let finalText = text;
  const isInsert = /^\s*INSERT\b/i.test(text);
  if (isInsert && !/\bRETURNING\b/i.test(text)) {
    finalText = `${text.replace(/;\s*$/, '')} RETURNING id`;
  }

  const result = await query(finalText, params, client);
  return {
    lastInsertRowid: result.rows[0]?.id,
    changes: result.rowCount ?? 0,
    rows: result.rows,
  };
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function ensureColumn(table, column, definition) {
  const row = await get(
    `SELECT 1 AS ok
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = ?
       AND column_name = ?`,
    [table, column]
  );
  if (!row) {
    await pool.query(
      `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`
    );
  }
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      trn TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
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
      labor_total DOUBLE PRECISION NOT NULL DEFAULT 0,
      parts_total DOUBLE PRECISION NOT NULL DEFAULT 0,
      tax_rate DOUBLE PRECISION NOT NULL DEFAULT 5,
      tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      discount DOUBLE PRECISION NOT NULL DEFAULT 0,
      subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
      total DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      authorized_by TEXT,
      received_by TEXT,
      vehicle_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      item_type TEXT NOT NULL DEFAULT 'service',
      unit TEXT NOT NULL DEFAULT 'Job',
      quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
      unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
      vat_rate DOUBLE PRECISION NOT NULL DEFAULT 5,
      vat_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      sale_date TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'service',
      amount DOUBLE PRECISION NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      expense_date TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'parts',
      amount DOUBLE PRECISION NOT NULL,
      vendor TEXT,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      sku TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'parts',
      unit TEXT NOT NULL DEFAULT 'Pcs',
      quantity_on_hand DOUBLE PRECISION NOT NULL DEFAULT 0,
      reorder_level DOUBLE PRECISION NOT NULL DEFAULT 0,
      cost_price DOUBLE PRECISION NOT NULL DEFAULT 0,
      sell_price DOUBLE PRECISION NOT NULL DEFAULT 0,
      supplier TEXT,
      location TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      movement_type TEXT NOT NULL,
      quantity DOUBLE PRECISION NOT NULL,
      unit_cost DOUBLE PRECISION,
      balance_after DOUBLE PRECISION NOT NULL,
      reference TEXT,
      notes TEXT,
      movement_date TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      make TEXT,
      model TEXT,
      year TEXT,
      plate_number TEXT,
      vin TEXT,
      mileage TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS backup_logs (
      id SERIAL PRIMARY KEY,
      backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      filename TEXT NOT NULL,
      created_by TEXT,
      invoice_count INTEGER NOT NULL DEFAULT 0,
      customer_count INTEGER NOT NULL DEFAULT 0,
      vehicle_count INTEGER NOT NULL DEFAULT 0,
      sale_count INTEGER NOT NULL DEFAULT 0,
      expense_count INTEGER NOT NULL DEFAULT 0,
      inventory_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS error_logs (
      id SERIAL PRIMARY KEY,
      mark TEXT NOT NULL DEFAULT 'X Error',
      source TEXT NOT NULL DEFAULT 'backend',
      level TEXT NOT NULL DEFAULT 'error',
      message TEXT NOT NULL,
      stack TEXT,
      name TEXT,
      path TEXT,
      method TEXT,
      status_code INTEGER,
      user_agent TEXT,
      ip TEXT,
      meta JSONB,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_error_logs_created_at
      ON error_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_at
      ON error_logs (resolved_at);
  `);

  await ensureColumn('customers', 'trn', 'TEXT');
  await ensureColumn('invoices', 'job_order_no', 'TEXT');
  await ensureColumn('invoices', 'mileage', 'TEXT');
  await ensureColumn('invoices', 'discount', 'DOUBLE PRECISION NOT NULL DEFAULT 0');
  await ensureColumn('invoices', 'prepared_by', 'TEXT');
  await ensureColumn('invoices', 'authorized_by', 'TEXT');
  await ensureColumn('invoices', 'received_by', 'TEXT');
  await ensureColumn('invoices', 'vehicle_id', 'INTEGER');
  await ensureColumn('invoice_items', 'unit', "TEXT NOT NULL DEFAULT 'Job'");
  await ensureColumn('invoice_items', 'vat_rate', 'DOUBLE PRECISION NOT NULL DEFAULT 5');
  await ensureColumn('invoice_items', 'vat_amount', 'DOUBLE PRECISION NOT NULL DEFAULT 0');

  return pool;
}

export default {
  pool,
  get,
  all,
  run,
  withTransaction,
  initDb,
};
