import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import invoicesRouter from './routes/invoices.js';
import salesRouter from './routes/sales.js';
import expensesRouter from './routes/expenses.js';
import inventoryRouter from './routes/inventory.js';
import vehiclesRouter from './routes/vehicles.js';
import dashboardRouter from './routes/dashboard.js';
import journalRouter from './routes/journal.js';
import { initDb } from './db.js';
import { ensureInvoiceSeries } from './ensureInvoiceSeries.js';
import { backfillInvoiceIncome } from './syncInvoiceSale.js';
import { syncCustomersAndVehiclesFromInvoices } from './syncFromInvoices.js';

const app = express();
const PORT = process.env.PORT || 4000;

/** Frontend URL(s) allowed to call this API. Comma-separated if needed. */
const corsOrigin = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (corsOrigin.length === 0) {
  console.warn(
    'CORS_ORIGIN is not set — all browser origins are blocked. Set e.g. CORS_ORIGIN=https://your-app.vercel.app'
  );
}

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, health checks) send no Origin
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/$/, '');
      if (corsOrigin.includes(normalized)) return callback(null, true);
      console.warn(`Blocked CORS origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'garage-finance-api',
    database: 'postgres',
    persistence: 'Cloud database via DATABASE_URL',
    cors_origin: corsOrigin,
  });
});

app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/journal', journalRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    detail: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

async function start() {
  await initDb();

  try {
    const renumbered = await ensureInvoiceSeries();
    if (renumbered > 0) {
      console.log(`Invoice series aligned from 00290 (${renumbered} invoice(s)).`);
    }
  } catch (err) {
    console.error('Invoice series alignment failed:', err.message);
  }

  try {
    const filled = await backfillInvoiceIncome();
    if (filled > 0) {
      console.log(`Backfilled income for ${filled} paid invoice(s).`);
    }
  } catch (err) {
    console.error('Invoice income backfill failed:', err.message);
  }

  try {
    const synced = await syncCustomersAndVehiclesFromInvoices();
    if (synced.customersFixed > 0 || synced.vehiclesLinked > 0) {
      console.log(
        `Synced from invoices — customers fixed: ${synced.customersFixed}, vehicles linked: ${synced.vehiclesLinked}`
      );
    }
  } catch (err) {
    console.error('Customer/vehicle sync from invoices failed:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Garage Finance API running on http://localhost:${PORT}`);
    console.log('Using cloud Postgres (DATABASE_URL)');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
