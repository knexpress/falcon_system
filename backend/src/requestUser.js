import { get } from './db.js';

/** Resolve the acting user from Falcon headers (username preferred). */
export async function getRequestUser(req) {
  const username = String(
    req.headers['x-falcon-user'] || req.body?.created_by || ''
  )
    .trim()
    .toLowerCase();
  if (!username) return null;
  return get(
    `SELECT id, name, username, role, is_active, avatar_url
     FROM users
     WHERE LOWER(username) = ? AND is_active = 1`,
    [username]
  );
}

export function isOwner(user) {
  return user && String(user.role).toLowerCase() === 'owner';
}

export function isStaff(user) {
  return user && String(user.role).toLowerCase() === 'staff';
}
