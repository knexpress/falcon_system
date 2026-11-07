export const HTTP_STATUS = {
  101: {
    title: '101 Switching Protocols',
    reason:
      'The connection is switching from standard HTTP to another protocol (for example WebSockets).',
  },
  200: {
    title: '200 OK',
    reason: 'The request completed successfully and the response was returned.',
  },
  201: {
    title: '201 Created',
    reason: 'A new resource was created and saved successfully.',
  },
  204: {
    title: '204 No Content',
    reason: 'The request succeeded with no response body.',
  },
  301: {
    title: '301 Moved Permanently',
    reason: 'This address has permanently moved to a new URL.',
  },
  302: {
    title: '302 Found',
    reason: 'This address is temporarily redirected.',
  },
  304: {
    title: '304 Not Modified',
    reason: 'Cached content is still valid; full body was not resent.',
  },
  400: {
    title: '400 Bad Request',
    reason: 'The request was malformed or missing required data.',
  },
  401: {
    title: '401 Unauthorized',
    reason: 'Authentication is required or credentials are invalid.',
  },
  403: {
    title: '403 Forbidden',
    reason: 'Authenticated, but not permitted to access this resource.',
  },
  404: {
    title: '404 Not Found',
    reason: 'No matching route or record was found.',
  },
  405: {
    title: '405 Method Not Allowed',
    reason: 'This HTTP method is not allowed on this endpoint.',
  },
  429: {
    title: '429 Too Many Requests',
    reason: 'Rate limit exceeded — slow down and retry.',
  },
  500: {
    title: '500 Internal Server Error',
    reason: 'A server-side failure occurred while handling the request.',
  },
  502: {
    title: '502 Bad Gateway',
    reason: 'Upstream proxy could not reach the application server.',
  },
  503: {
    title: '503 Service Unavailable',
    reason: 'Service is overloaded or temporarily unavailable.',
  },
  504: {
    title: '504 Gateway Timeout',
    reason: 'Upstream server took too long to respond.',
  },
};

export function httpMeta(status, detail) {
  const code = Number(status) || 500;
  const base = HTTP_STATUS[code] || {
    title: `${code} Response`,
    reason: 'HTTP response from Falcon API.',
  };
  return {
    status: code,
    title: base.title,
    reason: base.reason,
    ...(detail ? { error: detail } : {}),
  };
}

export function sendJson(res, status, payload = {}) {
  const meta = httpMeta(status, payload.error);
  return res.status(status).json({
    ...payload,
    status: meta.status,
    title: meta.title,
    reason: meta.reason,
  });
}
