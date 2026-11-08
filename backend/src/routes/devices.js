import { Router } from 'express';
import { get, run } from '../db.js';
import { getRequestUser } from '../requestUser.js';
import { sendJson } from '../httpStatus.js';
import {
  listAlertsForUser,
  markAlertRead,
} from '../notify.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    if (!actor) return sendJson(res, 401, { error: 'Not signed in.' });

    const token = String(req.body?.token || '').trim();
    const platform = String(req.body?.platform || 'android').trim();
    if (!token) {
      return sendJson(res, 400, { error: 'Device token is required.' });
    }

    const existing = await get(
      `SELECT id FROM device_tokens WHERE token = ?`,
      [token]
    );
    if (existing) {
      await run(
        `UPDATE device_tokens
         SET username = ?, role = ?, platform = ?, updated_at = NOW()
         WHERE token = ?`,
        [actor.username, actor.role, platform, token]
      );
    } else {
      await run(
        `INSERT INTO device_tokens (username, role, token, platform)
         VALUES (?, ?, ?, ?)`,
        [actor.username, actor.role, token, platform]
      );
    }

    sendJson(res, 200, { ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/register', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    if (!actor) return sendJson(res, 401, { error: 'Not signed in.' });
    const token = String(req.body?.token || req.query?.token || '').trim();
    if (token) {
      await run(`DELETE FROM device_tokens WHERE token = ?`, [token]);
    } else {
      await run(`DELETE FROM device_tokens WHERE LOWER(username) = LOWER(?)`, [
        actor.username,
      ]);
    }
    sendJson(res, 200, { ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/alerts', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    if (!actor) return sendJson(res, 401, { error: 'Not signed in.' });
    const unreadOnly = String(req.query.unread || '1') !== '0';
    const alerts = await listAlertsForUser(actor, { unreadOnly });
    sendJson(res, 200, alerts);
  } catch (err) {
    next(err);
  }
});

router.post('/alerts/:id/read', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    if (!actor) return sendJson(res, 401, { error: 'Not signed in.' });
    await markAlertRead(req.params.id, actor);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
