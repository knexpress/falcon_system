import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get } from '../db.js';
import { sendJson } from '../httpStatus.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return sendJson(res, 400, {
        error: 'Username and password are required',
      });
    }

    const user = await get(
      `SELECT id, name, username, password_hash, role, is_active
       FROM users
       WHERE LOWER(username) = ?`,
      [username]
    );

    if (!user || !user.is_active) {
      return sendJson(res, 401, {
        error: 'Invalid username or password',
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return sendJson(res, 401, {
        error: 'Invalid username or password',
      });
    }

    sendJson(res, 200, {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
