import bcrypt from 'bcryptjs';
import { initDb, get, run } from './db.js';

const USERS = [
  { name: 'Mariel', username: 'mariel', password: 'Falcon@123', role: 'staff' },
  { name: 'Arnie', username: 'arnie', password: 'Falcon@123', role: 'staff' },
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
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
