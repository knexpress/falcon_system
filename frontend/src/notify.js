const listeners = new Set();

export function subscribeNotify(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify(notice) {
  if (!notice) return;
  for (const listener of listeners) {
    try {
      listener(notice);
    } catch {
      // never break callers
    }
  }
}

export function notifyHttp( partial ) {
  // lazy import cycle-safe: callers pass full notice from buildHttpNotice
  notify(partial);
}
