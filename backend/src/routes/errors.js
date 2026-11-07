import { Router } from 'express';
import { all, get, run } from '../db.js';
import { captureError, ERROR_MARK } from '../errorLogger.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const source = String(req.query.source || '').trim();
    const unresolvedOnly = req.query.unresolved === '1';

    let sql = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];

    if (source) {
      sql += ' AND source = ?';
      params.push(source);
    }
    if (unresolvedOnly) {
      sql += ' AND resolved_at IS NULL';
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = await all(sql, params);
    const openCount = await get(
      `SELECT COUNT(*)::int AS count FROM error_logs WHERE resolved_at IS NULL`
    );

    res.json({
      mark: ERROR_MARK,
      open_count: openCount?.count || 0,
      errors: rows,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const fakeErr = {
      name: body.name || 'Error',
      message: String(body.message || body.error || 'Unknown error'),
      stack: body.stack || null,
    };

    const id = await captureError(fakeErr, {
      source: body.source || 'frontend',
      mark: ERROR_MARK,
      level: body.level || 'error',
      path: body.path || null,
      method: body.method || null,
      status_code: body.status_code ?? null,
      user_agent: req.get('user-agent') || body.user_agent || null,
      ip: req.ip || null,
      meta: {
        ...(body.meta || {}),
        href: body.href || null,
      },
    });

    res.status(201).json({ ok: true, id, mark: ERROR_MARK });
  } catch (err) {
    next(err);
  }
});

router.post('/resolve-all', async (_req, res, next) => {
  try {
    const result = await run(
      `UPDATE error_logs SET resolved_at = NOW() WHERE resolved_at IS NULL`
    );
    res.json({ ok: true, resolved: result.changes || 0 });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await get('SELECT * FROM error_logs WHERE id = ?', [
      req.params.id,
    ]);
    if (!row) return res.status(404).json({ error: 'Error log not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resolve', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM error_logs WHERE id = ?', [
      req.params.id,
    ]);
    if (!existing) return res.status(404).json({ error: 'Error log not found' });

    await run(
      `UPDATE error_logs SET resolved_at = NOW() WHERE id = ?`,
      [req.params.id]
    );
    res.json(await get('SELECT * FROM error_logs WHERE id = ?', [req.params.id]));
  } catch (err) {
    next(err);
  }
});

export default router;
