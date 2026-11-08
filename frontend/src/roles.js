/** Role helpers — superadmin has every capability. */

export function normalizeRole(role) {
  return String(role || 'staff')
    .toLowerCase()
    .trim();
}

export function isSuperAdmin(role) {
  return normalizeRole(role) === 'superadmin';
}

/** Owner + superadmin (approvals, oversight). */
export function isOwnerRole(role) {
  const r = normalizeRole(role);
  return r === 'owner' || r === 'superadmin';
}

/** Staff + superadmin (create quotes/invoices, finance screens). */
export function isStaffRole(role) {
  const r = normalizeRole(role);
  return r === 'staff' || r === 'superadmin';
}

export function roleLabel(role) {
  const r = normalizeRole(role);
  if (r === 'superadmin') return 'Superadmin';
  if (r === 'owner') return 'Owner';
  return 'Staff';
}

/** Nav filter — superadmin sees every item. */
export function navAllows(roles, role) {
  if (isSuperAdmin(role)) return true;
  return (roles || ['owner', 'staff']).includes(normalizeRole(role));
}
