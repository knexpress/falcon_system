import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import customersRouter from './routes/customers.js';
import invoicesRouter from './routes/invoices.js';
import salesRouter from './routes/sales.js';
import expensesRouter from './routes/expenses.js';
import inventoryRouter from './routes/inventory.js';
import vehiclesRouter from './routes/vehicles.js';
import dashboardRouter from './routes/dashboard.js';
import db from './db.js';
import { ensureInvoiceSeries } from './utils.js';
import { backfillInvoiceIncome } from './syncInvoiceSale.js';
import { backfillVehiclesFromInvoices } from './vehicles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_PATH = path.join(__dirname, '..', 'data', 'garage.db');

const app = express();
const PORT = process.env.PORT || 4000;

try {
  const renumbered = ensureInvoiceSeries(db);
  if (renumbered > 0) {
    console.log(`Invoice series aligned from 00290 (${renumbered} invoice(s)).`);
  }
} catch (err) {
  console.error('Invoice series alignment failed:', err.message);
}

try {
  const filled = backfillInvoiceIncome();
  if (filled > 0) {
    console.log(`Backfilled income for ${filled} paid invoice(s).`);
  }
} catch (err) {
  console.error('Invoice income backfill failed:', err.message);
}

try {
  const vehiclesLinked = backfillVehiclesFromInvoices();
  if (vehiclesLinked > 0) {
    console.log(`Backfilled ${vehiclesLinked} invoice(s) into vehicles.`);
  }
} catch (err) {
  console.error('Vehicle backfill failed:', err.message);
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'garage-finance-api',
    database: 'local-sqlite',
    databasePath: LOCAL_DB_PATH,
    persistence: 'All invoices and past work stay on this laptop in garage.db',
  });
});

app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Garage Finance API running on http://localhost:${PORT}`);
  console.log(`Local database (stays on this laptop): ${LOCAL_DB_PATH}`);
});
