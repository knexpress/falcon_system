import { Router } from 'express';
import { all, get, run } from '../db.js';

const router = Router();

const BACKUP_TZ = process.env.BACKUP_TZ || 'Asia/Dubai';

function formatStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function startOfTodayInTz(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  const utcGuess = Date.parse(`${y}-${m}-${d}T00:00:00Z`);
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  // Find the UTC instant where the workshop clock shows 00:00:00 today
  let instant = utcGuess;
  for (let i = 0; i < 48; i += 1) {
    const probe = new Date(utcGuess - 12 * 3600 * 1000 + i * 3600 * 1000);
    const f = Object.fromEntries(
      tzFormatter.formatToParts(probe).map((p) => [p.type, p.value])
    );
    if (
      f.year === y &&
      f.month === m &&
      f.day === d &&
      f.hour === '00' &&
      f.minute === '00'
    ) {
      instant = probe.getTime();
      break;
    }
  }
  return new Date(instant);
}

async function buildBackupPayload() {
  const [
    customers,
    invoices,
    invoiceItems,
    sales,
    expenses,
    vehicles,
    inventoryItems,
    inventoryMovements,
    users,
  ] = await Promise.all([
    all('SELECT * FROM customers ORDER BY id'),
    all('SELECT * FROM invoices ORDER BY id'),
    all('SELECT * FROM invoice_items ORDER BY id'),
    all('SELECT * FROM sales ORDER BY id'),
    all('SELECT * FROM expenses ORDER BY id'),
    all('SELECT * FROM vehicles ORDER BY id'),
    all('SELECT * FROM inventory_items ORDER BY id'),
    all('SELECT * FROM inventory_movements ORDER BY id'),
    all(
      'SELECT id, name, username, role, is_active, created_at FROM users ORDER BY id'
    ),
  ]);

  const counts = {
    customers: customers.length,
    invoices: invoices.length,
    invoice_items: invoiceItems.length,
    sales: sales.length,
    expenses: expenses.length,
    vehicles: vehicles.length,
    inventory_items: inventoryItems.length,
    inventory_movements: inventoryMovements.length,
    users: users.length,
  };

  return {
    meta: {
      app: 'falcon-garage-finance',
      version: 1,
      exported_at: new Date().toISOString(),
      timezone: BACKUP_TZ,
      schedule_note: 'Daily local backup recommended at 12:00 AM',
      counts,
    },
    data: {
      customers,
      invoices,
      invoice_items: invoiceItems,
      sales,
      expenses,
      vehicles,
      inventory_items: inventoryItems,
      inventory_movements: inventoryMovements,
      users,
    },
  };
}

router.get('/status', async (_req, res, next) => {
  try {
    const latest = await get(
      `SELECT * FROM backup_logs ORDER BY backed_up_at DESC LIMIT 1`
    );
    const dayStart = startOfTodayInTz(BACKUP_TZ);
    const todayCount = await get(
      `SELECT COUNT(*)::int AS count
       FROM backup_logs
       WHERE backed_up_at >= ?`,
      [dayStart.toISOString()]
    );

    const todayDone = (todayCount?.count || 0) > 0;
    let pendingDays = 0;
    if (!todayDone) {
      if (!latest?.backed_up_at) {
        pendingDays = 1;
      } else {
        const last = new Date(latest.backed_up_at);
        const ms = dayStart.getTime() - last.getTime();
        // Days from last backup calendar day up to (and including) today
        pendingDays = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
      }
    }

    res.json({
      timezone: BACKUP_TZ,
      daily_due_at: '00:00',
      today_backup_done: todayDone,
      today_backup_count: todayCount?.count || 0,
      pending_days: pendingDays,
      last_backup: latest || null,
      day_started_at: dayStart.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const logs = await all(
      `SELECT * FROM backup_logs
       ORDER BY backed_up_at DESC
       LIMIT 50`
    );
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const createdBy =
      String(req.query.by || req.headers['x-falcon-user'] || '').trim() ||
      'staff';
    const payload = await buildBackupPayload();
    const stamp = formatStamp(new Date());
    const filename = `falcon-daily-backup-${stamp}.json`;
    const exportedAt = new Date().toISOString();

    // Do not log here — only record after the client finishes the download
    payload.meta.created_by = createdBy;
    payload.meta.filename = filename;
    payload.meta.exported_at = exportedAt;

    const body = JSON.stringify(payload, null, 2);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.setHeader('X-Falcon-Backup-Filename', filename);
    res.setHeader('X-Falcon-Backup-At', exportedAt);
    res.send(body);
  } catch (err) {
    next(err);
  }
});

router.post('/record', async (req, res, next) => {
  try {
    const createdBy =
      String(
        req.body?.created_by ||
          req.headers['x-falcon-user'] ||
          req.query.by ||
          ''
      ).trim() || 'staff';
    const filename =
      String(req.body?.filename || '').trim() ||
      `falcon-daily-backup-${formatStamp(new Date())}.json`;

    const payload = await buildBackupPayload();
    const result = await run(
      `INSERT INTO backup_logs (
        filename, created_by, invoice_count, customer_count, vehicle_count,
        sale_count, expense_count, inventory_count, notes, backed_up_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        filename,
        createdBy,
        payload.meta.counts.invoices,
        payload.meta.counts.customers,
        payload.meta.counts.vehicles,
        payload.meta.counts.sales,
        payload.meta.counts.expenses,
        payload.meta.counts.inventory_items,
        'Daily local machine backup',
      ]
    );

    const log = await get('SELECT * FROM backup_logs WHERE id = ?', [
      result.lastInsertRowid,
    ]);
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

export default router;
