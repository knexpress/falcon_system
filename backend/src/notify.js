import { all, get, run } from './db.js';

/**
 * Create an in-app alert and, when Firebase is configured, attempt FCM push.
 * FCM is optional — mobile also polls silently in the background.
 */
export async function createAlert({
  audienceRole = null,
  audienceUsername = null,
  title,
  body,
  data = {},
}) {
  const result = await run(
    `INSERT INTO app_alerts
      (audience_role, audience_username, title, body, data_json)
     VALUES (?, ?, ?, ?, ?)`,
    [
      audienceRole,
      audienceUsername,
      title,
      body,
      data || {},
    ]
  );

  const alertId = result.lastInsertRowid;
  await pushToDevices({
    audienceRole,
    audienceUsername,
    title,
    body,
    data: { ...data, alert_id: String(alertId) },
  }).catch((err) => {
    console.warn('FCM push skipped/failed:', err.message);
  });

  return alertId;
}

export async function notifyOwnersPendingApproval(invoice) {
  const number = invoice?.invoice_number || 'Quotation';
  const customer = invoice?.customer_name || 'customer';
  return createAlert({
    audienceRole: 'owner',
    title: 'Approval needed',
    body: `${number} for ${customer} is waiting for review.`,
    data: {
      type: 'pending_approval',
      invoice_id: String(invoice?.id ?? ''),
      invoice_number: number,
    },
  });
}

export async function notifyStaffChangesRequested(invoice) {
  const number = invoice?.invoice_number || 'Quotation';
  const target =
    invoice?.created_by ||
    invoice?.prepared_by ||
    null;
  return createAlert({
    audienceRole: target ? null : 'staff',
    audienceUsername: target,
    title: 'Changes requested',
    body: `${number} was sent back: ${invoice?.approval_note || 'See note in Quotes.'}`,
    data: {
      type: 'changes_requested',
      invoice_id: String(invoice?.id ?? ''),
      invoice_number: number,
    },
  });
}

export async function notifyStaffApproved(invoice) {
  const number = invoice?.invoice_number || 'Quotation';
  const target =
    invoice?.created_by ||
    invoice?.prepared_by ||
    null;
  return createAlert({
    audienceRole: target ? null : 'staff',
    audienceUsername: target,
    title: 'Quotation approved',
    body: `${number} was approved by Cedrick.`,
    data: {
      type: 'approved',
      invoice_id: String(invoice?.id ?? ''),
      invoice_number: number,
    },
  });
}

async function pushToDevices({
  audienceRole,
  audienceUsername,
  title,
  body,
  data,
}) {
  const credPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credPath && !credJson) return;

  let tokens = [];
  if (audienceUsername) {
    tokens = await all(
      `SELECT token FROM device_tokens WHERE LOWER(username) = LOWER(?)`,
      [audienceUsername]
    );
  } else if (audienceRole) {
    tokens = await all(
      `SELECT dt.token
       FROM device_tokens dt
       JOIN users u ON LOWER(u.username) = LOWER(dt.username)
       WHERE LOWER(u.role) = LOWER(?) AND u.is_active = 1`,
      [audienceRole]
    );
  }

  const list = tokens.map((t) => t.token).filter(Boolean);
  if (list.length === 0) return;

  const admin = await loadFirebaseAdmin(credPath, credJson);
  if (!admin) return;

  const stringData = {};
  for (const [k, v] of Object.entries(data || {})) {
    stringData[k] = v == null ? '' : String(v);
  }

  await admin.messaging().sendEachForMulticast({
    tokens: list,
    notification: { title, body },
    data: stringData,
    android: {
      priority: 'high',
      notification: {
        channelId: 'falcon_alerts',
        priority: 'high',
      },
    },
  });
}

let firebaseApp = null;

async function loadFirebaseAdmin(credPath, credJson) {
  if (firebaseApp) return firebaseApp;
  try {
    const mod = await import('firebase-admin');
    const admin = mod.default || mod;
    let credential;
    if (credJson) {
      credential = admin.credential.cert(JSON.parse(credJson));
    } else {
      const fs = await import('fs');
      credential = admin.credential.cert(
        JSON.parse(fs.readFileSync(credPath, 'utf8'))
      );
    }
    firebaseApp = admin.initializeApp({ credential });
    return firebaseApp;
  } catch (err) {
    console.warn(
      'firebase-admin not available. Install it and set FIREBASE_SERVICE_ACCOUNT to enable remote push.',
      err.message
    );
    return null;
  }
}

export async function listAlertsForUser(user, { unreadOnly = true } = {}) {
  if (!user) return [];
  const rows = await all(
    `SELECT id, title, body, data_json, created_at, read_at
     FROM app_alerts
     WHERE
       (audience_username IS NOT NULL AND LOWER(audience_username) = LOWER(?))
       OR (audience_username IS NULL AND audience_role IS NOT NULL AND LOWER(audience_role) = LOWER(?))
       OR (audience_username IS NULL AND audience_role IS NULL)
     ORDER BY created_at DESC
     LIMIT 50`,
    [user.username, user.role]
  );
  return rows
    .filter((r) => (unreadOnly ? !r.read_at : true))
    .map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      data:
        typeof r.data_json === 'string'
          ? JSON.parse(r.data_json || '{}')
          : r.data_json || {},
      created_at: r.created_at,
      read_at: r.read_at,
    }));
}

export async function markAlertRead(id, user) {
  await run(
    `UPDATE app_alerts SET read_at = NOW()
     WHERE id = ?
       AND (
         (audience_username IS NOT NULL AND LOWER(audience_username) = LOWER(?))
         OR (audience_username IS NULL AND audience_role IS NOT NULL AND LOWER(audience_role) = LOWER(?))
         OR (audience_username IS NULL AND audience_role IS NULL)
       )`,
    [id, user.username, user.role]
  );
  return get(`SELECT * FROM app_alerts WHERE id = ?`, [id]);
}
