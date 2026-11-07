import { run } from './db.js';

const ERROR_MARK = 'X Error';
const recentKeys = new Map();
let installingConsoleHook = false;
let consoleHookInstalled = false;

function normalizeError(input) {
  if (input instanceof Error) {
    return {
      name: input.name || 'Error',
      message: input.message || String(input),
      stack: input.stack || null,
    };
  }
  if (typeof input === 'string') {
    return { name: 'Error', message: input, stack: null };
  }
  if (input && typeof input === 'object' && (input.message || input.stack)) {
    return {
      name: input.name || 'Error',
      message: String(input.message || 'Unknown error'),
      stack: input.stack || null,
    };
  }
  try {
    return {
      name: 'Error',
      message: JSON.stringify(input),
      stack: null,
    };
  } catch {
    return { name: 'Error', message: String(input), stack: null };
  }
}

function isDuplicate(key) {
  const now = Date.now();
  for (const [k, at] of recentKeys) {
    if (now - at > 8000) recentKeys.delete(k);
  }
  const prev = recentKeys.get(key);
  if (prev && now - prev < 8000) return true;
  recentKeys.set(key, now);
  return false;
}

/**
 * Persist an error as "X Error" in error_logs. Never throws.
 */
export async function captureError(input, context = {}) {
  const normalized = normalizeError(input);
  const mark = context.mark || ERROR_MARK;
  const source = context.source || 'backend';
  const level = context.level || 'error';
  const meta =
    context.meta && typeof context.meta === 'object' ? context.meta : null;
  const message = normalized.message.slice(0, 4000);
  const dedupeKey = [
    source,
    context.path || '',
    message,
    (normalized.stack || '').split('\n')[0] || '',
  ].join('|');

  if (isDuplicate(dedupeKey)) return null;

  try {
    const result = await run(
      `INSERT INTO error_logs (
        mark, source, level, message, stack, name,
        path, method, status_code, user_agent, ip, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)`,
      [
        mark,
        source,
        level,
        message,
        normalized.stack ? String(normalized.stack).slice(0, 12000) : null,
        normalized.name,
        context.path || null,
        context.method || null,
        context.status_code ?? null,
        context.user_agent || null,
        context.ip || null,
        meta ? JSON.stringify(meta) : null,
      ]
    );
    return result.lastInsertRowid;
  } catch (err) {
    // Avoid recursive logging loops — write directly, not via hooked console.error
    process.stderr.write(
      `[errorLogger] failed to persist X Error: ${err.message}\n`
    );
    return null;
  }
}

export function captureErrorFromRequest(err, req, extra = {}) {
  return captureError(err, {
    source: 'backend',
    mark: ERROR_MARK,
    path: req?.originalUrl || req?.url || null,
    method: req?.method || null,
    status_code: extra.status_code ?? 500,
    user_agent: req?.get?.('user-agent') || null,
    ip: req?.ip || req?.socket?.remoteAddress || null,
    meta: {
      query: req?.query || null,
      ...(extra.meta || {}),
    },
  });
}

/** Hook console.error so Render/backend error prints also land in error_logs. */
export function installConsoleErrorHook() {
  if (consoleHookInstalled || installingConsoleHook) return;
  installingConsoleHook = true;
  const original = console.error.bind(console);

  console.error = (...args) => {
    original(...args);
    try {
      const firstErr = args.find((a) => a instanceof Error);
      const message = args
        .map((a) => {
          if (a instanceof Error) return a.message;
          if (typeof a === 'string') return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(' ')
        .slice(0, 4000);

      // Skip our own logger failures
      if (message.includes('[errorLogger]')) return;

      void captureError(firstErr || message, {
        source: 'backend',
        mark: ERROR_MARK,
        level: 'error',
        meta: { via: 'console.error' },
      });
    } catch {
      // never break logging
    }
  };

  consoleHookInstalled = true;
  installingConsoleHook = false;
}

export function installProcessErrorHandlers() {
  process.on('unhandledRejection', (reason) => {
    void captureError(reason, {
      source: 'backend',
      mark: ERROR_MARK,
      meta: { via: 'unhandledRejection' },
    });
  });

  process.on('uncaughtException', (err) => {
    void captureError(err, {
      source: 'backend',
      mark: ERROR_MARK,
      meta: { via: 'uncaughtException' },
    });
  });
}

export { ERROR_MARK };
