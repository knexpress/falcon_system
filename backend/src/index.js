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
import backupsRouter from './routes/backups.js';
import errorsRouter from './routes/errors.js';
import devicesRouter from './routes/devices.js';
import { initDb } from './db.js';
import {
  captureError,
  captureErrorFromRequest,
  installConsoleErrorHook,
  installProcessErrorHandlers,
} from './errorLogger.js';
import { sendJson } from './httpStatus.js';
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
    exposedHeaders: [
      'Content-Disposition',
      'X-Falcon-Backup-Id',
      'X-Falcon-Backup-At',
    ],
  })
);
app.use(express.json({ limit: '1mb' }));

/** Simple per-IP rate limit → 429 Too Many Requests */
const rateBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 180;

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX) {
    return sendJson(res, 429, {
      error: 'Too many requests from this client. Please wait and retry.',
    });
  }
  return next();
});

function describeDatabase() {
  const url = process.env.DATABASE_URL || '';
  const local =
    process.env.DATABASE_SSL === 'false' ||
    /@(localhost|127\.0\.0\.1)(:|\/)/i.test(url);
  let host = 'unknown';
  try {
    host = new URL(url.replace(/^postgresql:/i, 'http:')).hostname;
  } catch {
    // ignore parse errors
  }
  return {
    local,
    host,
    label: local
      ? `Local Docker Postgres (${host})`
      : `Cloud Postgres (${host})`,
  };
}

app.get('/api/health', (_req, res) => {
  const db = describeDatabase();
  res.json({
    ok: true,
    service: 'garage-finance-api',
    database: 'postgres',
    persistence: db.label,
    database_host: db.host,
    local_dev: db.local,
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
app.use('/api/backups', backupsRouter);
app.use('/api/errors', errorsRouter);
app.use('/api/devices', devicesRouter);

// Unknown API route
app.use('/api', (req, res) => {
  sendJson(res, 404, {
    error: `No API route for ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, _next) => {
  const status = Number(err.status || err.statusCode) || 500;
  if (status >= 500) {
    void captureErrorFromRequest(err, req, { status_code: status });
  }
  console.error(err);
  sendJson(res, status, {
    error: err.message || 'Internal server error',
    mark: status >= 500 ? 'X Error' : undefined,
  });
});

async function start() {
  await initDb();
  installConsoleErrorHook();
  installProcessErrorHandlers();

  try {
    const renumbered = await ensureInvoiceSeries();
    if (renumbered > 0) {
      console.log(`Invoice series aligned from 00290 (${renumbered} invoice(s)).`);
    }
  } catch (err) {
    console.error('Invoice series alignment failed:', err.message);
    void captureError(err, {
      source: 'backend',
      meta: { via: 'ensureInvoiceSeries' },
    });
  }

  try {
    const filled = await backfillInvoiceIncome();
    if (filled > 0) {
      console.log(`Backfilled income for ${filled} paid invoice(s).`);
    }
  } catch (err) {
    console.error('Invoice income backfill failed:', err.message);
    void captureError(err, {
      source: 'backend',
      meta: { via: 'backfillInvoiceIncome' },
    });
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
    void captureError(err, {
      source: 'backend',
      meta: { via: 'syncCustomersAndVehiclesFromInvoices' },
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const db = describeDatabase();
    console.log(`Garage Finance API running on http://0.0.0.0:${PORT}`);
    console.log(`Using ${db.label}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  void captureError(err, {
    source: 'backend',
    meta: { via: 'start' },
  }).finally(() => process.exit(1));
});
