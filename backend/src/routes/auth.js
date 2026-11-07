import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get } from '../db.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await get(
      `SELECT id, name, username, password_hash, role, is_active
       FROM users
       WHERE LOWER(username) = ?`,
      [username]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
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
