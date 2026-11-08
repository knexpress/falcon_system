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

function roleOf(user) {
  return String(user?.role || '')
    .toLowerCase()
    .trim();
}

export function isSuperAdmin(user) {
  return Boolean(user) && roleOf(user) === 'superadmin';
}

/** Owner powers (approvals) — also granted to superadmin. */
export function isOwner(user) {
  if (!user) return false;
  const role = roleOf(user);
  return role === 'owner' || role === 'superadmin';
}

/** Staff powers (create docs / finance ops) — also granted to superadmin. */
export function isStaff(user) {
  if (!user) return false;
  const role = roleOf(user);
  return role === 'staff' || role === 'superadmin';
}
