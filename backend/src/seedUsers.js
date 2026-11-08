import bcrypt from 'bcryptjs';
import { initDb, get, run, all } from './db.js';

const USERS = [
  {
    name: 'Cedrick',
    username: 'cedrick@falconrevive.ae',
    password: 'falcon@123',
    role: 'owner',
  },
  {
    name: 'Mariel',
    username: 'mariel@falconrevive.ae',
    password: 'falcon@123',
    role: 'staff',
  },
  {
    name: 'Arnie',
    username: 'arnie@falconrevive.ae',
    password: 'falcon@123',
    role: 'staff',
  },
];

async function upsertUser({ name, username, password, role }) {
  const hash = await bcrypt.hash(password, 10);
  const existing = await get(
    'SELECT id FROM users WHERE LOWER(username) = ?',
    [username.toLowerCase()]
  );

  if (existing) {
    await run(
      `UPDATE users
       SET name = ?, password_hash = ?, role = ?, is_active = 1
       WHERE id = ?`,
      [name, hash, role, existing.id]
    );
    return { username, action: 'updated' };
  }

  await run(
    `INSERT INTO users (name, username, password_hash, role)
     VALUES (?, ?, ?, ?)`,
    [name, username.toLowerCase(), hash, role]
  );
  return { username, action: 'created' };
}

async function main() {
  await initDb();

  for (const user of USERS) {
    const result = await upsertUser(user);
    console.log(`${result.action}: ${result.username}`);
  }

  // Keep only the active team logins; disable older accounts (e.g. admin@)
  const keep = USERS.map((u) => u.username.toLowerCase());
  const others = await all('SELECT id, username FROM users');
  for (const row of others) {
    if (!keep.includes(String(row.username).toLowerCase())) {
      await run('UPDATE users SET is_active = 0 WHERE id = ?', [row.id]);
      console.log(`deactivated: ${row.username}`);
    }
  }

  const active = await all(
    'SELECT id, name, username, role, is_active FROM users ORDER BY id'
  );
  console.log('users:', active);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
