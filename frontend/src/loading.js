const listeners = new Set();
/** @type {Map<string, number>} */
const active = new Map();

function emit() {
  const count = [...active.values()].reduce((sum, n) => sum + n, 0);
  const keys = [...active.keys()];
  for (const listener of listeners) {
    try {
      listener({ count, keys, busy: count > 0 });
    } catch {
      // ignore listener failures
    }
  }
}

export function subscribeLoading(listener) {
  listeners.add(listener);
  listener({
    count: [...active.values()].reduce((sum, n) => sum + n, 0),
    keys: [...active.keys()],
    busy: active.size > 0,
  });
  return () => listeners.delete(listener);
}

export function beginLoading(key = 'default') {
  const id = String(key);
  active.set(id, (active.get(id) || 0) + 1);
  emit();
  return id;
}

export function endLoading(key = 'default') {
  const id = String(key);
  const next = (active.get(id) || 0) - 1;
  if (next <= 0) active.delete(id);
  else active.set(id, next);
  emit();
}

export async function withLoading(key, fn) {
  beginLoading(key);
  try {
    return await fn();
  } finally {
    endLoading(key);
  }
}

export function isLoading() {
  return active.size > 0;
}
