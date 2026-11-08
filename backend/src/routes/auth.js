import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db.js';
import { sendJson } from '../httpStatus.js';
import { getRequestUser } from '../requestUser.js';

const router = Router();

const MAX_AVATAR_CHARS = 350_000; // ~250KB data URL

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.username,
    role: user.role,
    avatar_url: user.avatar_url || null,
  };
}

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
      `SELECT id, name, username, password_hash, role, is_active, avatar_url
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

    sendJson(res, 200, publicUser(user));
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    if (!actor) {
      return sendJson(res, 401, { error: 'Not signed in.' });
    }
    const user = await get(
      `SELECT id, name, username, role, avatar_url
       FROM users WHERE id = ?`,
      [actor.id]
    );
    sendJson(res, 200, publicUser(user));
  } catch (err) {
    next(err);
  }
});

router.put('/profile', async (req, res, next) => {
  try {
    const actor = await getRequestUser(req);
    if (!actor) {
      return sendJson(res, 401, { error: 'Not signed in.' });
    }

    const name = String(req.body?.name || '').trim();
    const username = String(req.body?.username || req.body?.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body?.password || '');
    const currentPassword = String(req.body?.current_password || '');
    let avatarUrl =
      req.body?.avatar_url === undefined
        ? undefined
        : req.body.avatar_url === null || req.body.avatar_url === ''
          ? null
          : String(req.body.avatar_url);

    if (!name) {
      return sendJson(res, 400, { error: 'Name is required.' });
    }
    if (!username || !username.includes('@')) {
      return sendJson(res, 400, {
        error: 'A valid email / username is required.',
      });
    }
    if (avatarUrl && avatarUrl.length > MAX_AVATAR_CHARS) {
      return sendJson(res, 400, {
        error: 'Profile picture is too large. Use a smaller image.',
      });
    }
    if (avatarUrl && !avatarUrl.startsWith('data:image/')) {
      return sendJson(res, 400, {
        error: 'Profile picture must be an uploaded image.',
      });
    }

    const existing = await get(
      'SELECT id FROM users WHERE LOWER(username) = ? AND id <> ?',
      [username, actor.id]
    );
    if (existing) {
      return sendJson(res, 409, {
        error: 'That email is already used by another account.',
      });
    }

    if (password) {
      if (!currentPassword) {
        return sendJson(res, 400, {
          error: 'Enter your current password to set a new one.',
        });
      }
      const row = await get(
        'SELECT password_hash FROM users WHERE id = ?',
        [actor.id]
      );
      const ok = await bcrypt.compare(currentPassword, row.password_hash);
      if (!ok) {
        return sendJson(res, 401, {
          error: 'Current password is incorrect.',
        });
      }
      if (password.length < 6) {
        return sendJson(res, 400, {
          error: 'New password must be at least 6 characters.',
        });
      }
    }

    const sets = ['name = ?', 'username = ?'];
    const params = [name, username];

    if (avatarUrl !== undefined) {
      sets.push('avatar_url = ?');
      params.push(avatarUrl);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sets.push('password_hash = ?');
      params.push(hash);
    }
    params.push(actor.id);

    await run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);

    const user = await get(
      `SELECT id, name, username, role, avatar_url
       FROM users WHERE id = ?`,
      [actor.id]
    );
    sendJson(res, 200, publicUser(user));
  } catch (err) {
    next(err);
  }
});

export default router;
