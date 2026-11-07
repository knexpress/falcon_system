import { api } from './api.js';

let installed = false;

function report(payload) {
  // Fire-and-forget; never break the UI
  api.reportError(payload).catch(() => {});
}

export function installClientErrorReporting() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    const err = event.error;
    report({
      source: 'frontend',
      name: err?.name || 'Error',
      message: err?.message || event.message || 'Unhandled error',
      stack: err?.stack || null,
      path: window.location.pathname,
      href: window.location.href,
      meta: {
        via: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';
    report({
      source: 'frontend',
      name: reason instanceof Error ? reason.name : 'UnhandledRejection',
      message,
      stack: reason instanceof Error ? reason.stack : null,
      path: window.location.pathname,
      href: window.location.href,
      meta: { via: 'unhandledrejection' },
    });
  });
}
