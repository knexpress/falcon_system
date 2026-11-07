/** Catalog of HTTP responses with user-facing titles and reasons. */
export const HTTP_STATUS = {
  101: {
    kind: 'info',
    title: '101 Switching Protocols',
    reason:
      'The connection is switching from standard HTTP to another protocol (for example WebSockets) for real-time updates.',
  },
  200: {
    kind: 'success',
    title: '200 OK',
    reason: 'The request completed successfully and the response was returned.',
  },
  201: {
    kind: 'success',
    title: '201 Created',
    reason: 'A new resource was created and saved successfully.',
  },
  204: {
    kind: 'success',
    title: '204 No Content',
    reason:
      'The request succeeded, and there is no response body to show (common after deletes or empty updates).',
  },
  301: {
    kind: 'info',
    title: '301 Moved Permanently',
    reason:
      'This address has permanently moved. Traffic and bookmarks should use the new URL.',
  },
  302: {
    kind: 'info',
    title: '302 Found',
    reason:
      'This address is temporarily redirected to another page for this request.',
  },
  304: {
    kind: 'info',
    title: '304 Not Modified',
    reason:
      'Your cached copy is still valid, so the server did not resend the full file.',
  },
  400: {
    kind: 'error',
    title: '400 Bad Request',
    reason:
      'The server could not understand the request — check required fields and data format.',
  },
  401: {
    kind: 'error',
    title: '401 Unauthorized',
    reason:
      'Login is required or the credentials provided are invalid. Sign in again to continue.',
  },
  403: {
    kind: 'error',
    title: '403 Forbidden',
    reason:
      'You are signed in, but you do not have permission to access this resource.',
  },
  404: {
    kind: 'error',
    title: '404 Not Found',
    reason:
      'Nothing matches this URL or record. It may have been deleted or the link is wrong.',
  },
  405: {
    kind: 'error',
    title: '405 Method Not Allowed',
    reason:
      'This action is not allowed on this endpoint (for example POST to a read-only route).',
  },
  429: {
    kind: 'error',
    title: '429 Too Many Requests',
    reason:
      'Too many requests were sent in a short time. Wait a moment, then try again.',
  },
  500: {
    kind: 'error',
    title: '500 Internal Server Error',
    reason:
      'A server-side script crashed or hit a configuration problem. The failure was logged as an X Error.',
  },
  502: {
    kind: 'error',
    title: '502 Bad Gateway',
    reason:
      'A proxy or load balancer could not reach the application server (common during Render restarts).',
  },
  503: {
    kind: 'error',
    title: '503 Service Unavailable',
    reason:
      'The service is overloaded or temporarily down for maintenance. Try again shortly.',
  },
  504: {
    kind: 'error',
    title: '504 Gateway Timeout',
    reason:
      'The upstream server took too long to respond. Check your connection or try again.',
  },
  0: {
    kind: 'error',
    title: 'Network Error',
    reason:
      'No HTTP response was received. The API may be offline, blocked by CORS, or the network dropped.',
  },
};

export function describeHttpStatus(status) {
  const code = Number(status);
  if (HTTP_STATUS[code]) {
    return { status: code, ...HTTP_STATUS[code] };
  }
  if (code >= 200 && code < 300) {
    return {
      status: code,
      kind: 'success',
      title: `${code} Success`,
      reason: 'The request completed successfully.',
    };
  }
  if (code >= 300 && code < 400) {
    return {
      status: code,
      kind: 'info',
      title: `${code} Redirect`,
      reason: 'The server redirected this request to another location.',
    };
  }
  if (code >= 400 && code < 500) {
    return {
      status: code,
      kind: 'error',
      title: `${code} Client Error`,
      reason: 'The request was rejected because of a client-side problem.',
    };
  }
  if (code >= 500) {
    return {
      status: code,
      kind: 'error',
      title: `${code} Server Error`,
      reason: 'The server failed while processing this request.',
    };
  }
  return {
    status: code || 0,
    kind: 'error',
    title: 'Unknown Response',
    reason: 'An unexpected HTTP status was returned.',
  };
}

export class HttpError extends Error {
  constructor({ status, title, reason, detail, data } = {}) {
    const info = describeHttpStatus(status ?? 0);
    super(detail || reason || info.reason || info.title);
    this.name = 'HttpError';
    this.status = info.status;
    this.title = title || info.title;
    this.reason = reason || info.reason;
    this.detail = detail || null;
    this.data = data || null;
    this.kind = info.kind;
  }
}

export function buildHttpNotice({
  status,
  detail,
  successMessage,
  path,
  method,
} = {}) {
  const info = describeHttpStatus(status ?? 0);
  const serverDetail =
    typeof detail === 'string' && detail.trim() ? detail.trim() : null;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: info.status,
    kind: info.kind === 'success' || info.kind === 'info' ? info.kind : 'error',
    title: info.title,
    reason: info.reason,
    detail: successMessage || serverDetail,
    path: path || null,
    method: method || null,
    createdAt: Date.now(),
  };
}
