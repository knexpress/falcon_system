import { buildHttpNotice, HttpError } from './httpStatus.js';
import { beginLoading, endLoading } from './loading.js';
import { notify } from './notify.js';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function authHeaders() {
  try {
    const auth = JSON.parse(localStorage.getItem('falcon_auth') || 'null');
    if (!auth?.username) return {};
    return {
      'X-Falcon-User': auth.username,
      'X-Falcon-Name': auth.name || '',
      'X-Falcon-Role': auth.role || '',
    };
  } catch {
    return {};
  }
}

async function parseBody(res) {
  if (res.status === 204) return {};
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function emitNotice({
  status,
  detail,
  successMessage,
  path,
  method,
  enabled,
}) {
  if (!enabled) return;
  notify(
    buildHttpNotice({
      status,
      detail,
      successMessage,
      path,
      method,
    })
  );
}

/**
 * @param {string} path
 * @param {RequestInit & {
 *   silent?: boolean,
 *   trackLoading?: boolean,
 *   notifySuccess?: boolean,
 *   notifyError?: boolean,
 *   successMessage?: string,
 * }} options
 */
async function request(path, options = {}) {
  const {
    headers: extraHeaders,
    silent = false,
    trackLoading = true,
    notifySuccess,
    notifyError = true,
    successMessage,
    ...rest
  } = options;
  const method = String(rest.method || 'GET').toUpperCase();
  const apiPath = `/api${path}`;
  const loadingKey = `${method} ${apiPath}`;
  const shouldNotifySuccess =
    !silent &&
    (notifySuccess ??
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method));
  const shouldNotifyError = !silent && notifyError;

  if (trackLoading) beginLoading(loadingKey);

  try {
    let res;
    try {
      res = await fetch(`${API_BASE}${apiPath}`, {
        ...rest,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          ...(extraHeaders || {}),
        },
      });
    } catch (networkErr) {
      const err = new HttpError({
        status: 0,
        detail: networkErr.message,
      });
      emitNotice({
        status: 0,
        detail: networkErr.message,
        path: apiPath,
        method,
        enabled: shouldNotifyError,
      });
      throw err;
    }

    const data = await parseBody(res);
    const serverDetail =
      data.error || data.message || data.title || data.reason || null;

    if (!res.ok) {
      const err = new HttpError({
        status: res.status,
        title: data.title,
        reason: data.reason,
        detail: serverDetail,
        data,
      });
      emitNotice({
        status: res.status,
        detail: serverDetail,
        path: apiPath,
        method,
        enabled: shouldNotifyError,
      });
      throw err;
    }

    emitNotice({
      status: res.status,
      detail: serverDetail,
      successMessage:
        successMessage ||
        (res.status === 201
          ? 'The new record was saved.'
          : res.status === 204
            ? 'The change was applied with no content returned.'
            : method === 'DELETE'
              ? 'The record was removed or cancelled.'
              : method === 'PUT' || method === 'PATCH'
                ? 'Your changes were saved.'
                : null),
      path: apiPath,
      method,
      enabled: shouldNotifySuccess,
    });

    return data;
  } finally {
    if (trackLoading) endLoading(loadingKey);
  }
}

async function handleBinaryResponse(res, apiPath, method, { silent, notifyError = true } = {}) {
  if (res.ok) {
    emitNotice({
      status: res.status,
      successMessage: 'File ready.',
      path: apiPath,
      method,
      enabled: !silent && (method !== 'GET'),
    });
    return res;
  }

  const data = await parseBody(res);
  const serverDetail = data.error || data.message || null;
  emitNotice({
    status: res.status,
    detail: serverDetail,
    path: apiPath,
    method,
    enabled: !silent && notifyError,
  });
  throw new HttpError({
    status: res.status,
    title: data.title,
    reason: data.reason,
    detail: serverDetail,
    data,
  });
}

export const api = {
  login: (body) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Signed in successfully.',
    }),
  getProfile: () => request('/auth/me', { silent: true }),
  updateProfile: (body) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
      successMessage: 'Profile updated.',
    }),

  getDashboard: () => request('/dashboard', { silent: true }),

  getJournal: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/journal${qs ? `?${qs}` : ''}`, { silent: true });
  },

  getCustomers: () => request('/customers', { silent: true }),
  createCustomer: (body) =>
    request('/customers', {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Customer created.',
    }),
  updateCustomer: (id, body) =>
    request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      successMessage: 'Customer updated.',
    }),
  deleteCustomer: (id) =>
    request(`/customers/${id}`, {
      method: 'DELETE',
      successMessage: 'Customer deleted.',
    }),

  getInvoices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/invoices${qs ? `?${qs}` : ''}`, { silent: true });
  },
  getQuotations: (params = {}) => {
    const qs = new URLSearchParams({ ...params, doc_type: 'quotation' }).toString();
    return request(`/invoices?${qs}`, { silent: true });
  },
  getInvoice: (id) => request(`/invoices/${id}`, { silent: true }),
  createInvoice: (body) =>
    request('/invoices', {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage:
        body?.doc_type === 'quotation'
          ? 'Quotation submitted for Cedrick’s approval.'
          : 'Invoice created.',
    }),
  updateInvoice: (id, body) =>
    request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      successMessage:
        body?.doc_type === 'quotation'
          ? 'Quotation updated.'
          : 'Invoice updated.',
    }),
  deleteInvoice: (id) =>
    request(`/invoices/${id}`, {
      method: 'DELETE',
      successMessage: 'Credit note issued / invoice cancelled.',
    }),
  issueDebitNote: (id) =>
    request(`/invoices/${id}/debit-note`, {
      method: 'POST',
      body: JSON.stringify({}),
      successMessage: 'Debit note issued — amount posted as income.',
    }),
  getPendingApprovals: () =>
    request('/invoices/pending-approvals', { silent: true }),
  approveInvoice: (id, body = {}) =>
    request(`/invoices/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Quotation approved — ready to generate invoice.',
    }),
  sendBackQuotation: (id, body = {}) =>
    request(`/invoices/${id}/send-back`, {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Quotation sent back for changes.',
    }),
  generateInvoiceFromQuotation: (id, body = {}) =>
    request(`/invoices/${id}/generate-invoice`, {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Invoice generated and journal entry posted.',
    }),
  async fetchInvoicePdfBlob(id) {
    const apiPath = `/api/invoices/${id}/pdf`;
    const loadingKey = `GET ${apiPath}`;
    beginLoading(loadingKey);
    try {
      let res;
      try {
        res = await fetch(`${API_BASE}${apiPath}`);
      } catch (networkErr) {
        emitNotice({
          status: 0,
          detail: networkErr.message,
          path: apiPath,
          method: 'GET',
          enabled: true,
        });
        throw new HttpError({ status: 0, detail: networkErr.message });
      }
      await handleBinaryResponse(res, apiPath, 'GET', {
        silent: true,
        notifyError: true,
      });
      return res.blob();
    } finally {
      endLoading(loadingKey);
    }
  },

  downloadInvoicePdf: async (id, filename = 'invoice.pdf') => {
    const blob = await api.fetchInvoicePdfBlob(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify(
      buildHttpNotice({
        status: 200,
        successMessage: `PDF downloaded as ${filename}.`,
        path: `/api/invoices/${id}/pdf`,
        method: 'GET',
      })
    );
  },

  viewInvoicePdf: async (id) => {
    const blob = await api.fetchInvoicePdfBlob(id);
    const url = URL.createObjectURL(
      new Blob([blob], { type: 'application/pdf' })
    );
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      URL.revokeObjectURL(url);
      const err = new HttpError({
        status: 403,
        detail: 'Popup blocked — allow popups to view the PDF',
      });
      notify(
        buildHttpNotice({
          status: 403,
          detail: err.message,
          path: `/api/invoices/${id}/pdf`,
          method: 'GET',
        })
      );
      throw err;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    notify(
      buildHttpNotice({
        status: 200,
        successMessage: 'PDF opened in a new tab.',
        path: `/api/invoices/${id}/pdf`,
        method: 'GET',
      })
    );
  },

  getSales: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sales${qs ? `?${qs}` : ''}`, { silent: true });
  },
  getSale: (id) => request(`/sales/${id}`, { silent: true }),
  createSale: (body) =>
    request('/sales', {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Sale recorded.',
    }),
  updateSale: (id, body) =>
    request(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      successMessage: 'Sale updated.',
    }),
  deleteSale: (id) =>
    request(`/sales/${id}`, {
      method: 'DELETE',
      successMessage: 'Sale deleted.',
    }),

  getExpenses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/expenses${qs ? `?${qs}` : ''}`, { silent: true });
  },
  getExpense: (id) => request(`/expenses/${id}`, { silent: true }),
  createExpense: (body) =>
    request('/expenses', {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Expense recorded.',
    }),
  updateExpense: (id, body) =>
    request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      successMessage: 'Expense updated.',
    }),
  deleteExpense: (id) =>
    request(`/expenses/${id}`, {
      method: 'DELETE',
      successMessage: 'Expense deleted.',
    }),

  getInventory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory${qs ? `?${qs}` : ''}`, { silent: true });
  },
  getInventorySummary: () =>
    request('/inventory/summary', { silent: true }),
  getInventoryItem: (id) => request(`/inventory/${id}`, { silent: true }),
  getInventoryMovements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory/movements${qs ? `?${qs}` : ''}`, {
      silent: true,
    });
  },
  createInventoryItem: (body) =>
    request('/inventory', {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Inventory item created.',
    }),
  updateInventoryItem: (id, body) =>
    request(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      successMessage: 'Inventory item updated.',
    }),
  deleteInventoryItem: (id) =>
    request(`/inventory/${id}`, {
      method: 'DELETE',
      successMessage: 'Inventory item deleted.',
    }),
  stockIn: (id, body) =>
    request(`/inventory/${id}/stock-in`, {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Stock received.',
    }),
  stockOut: (id, body) =>
    request(`/inventory/${id}/stock-out`, {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Stock issued.',
    }),
  stockAdjust: (id, body) =>
    request(`/inventory/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Stock adjusted.',
    }),

  getVehicles: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/vehicles${qs ? `?${qs}` : ''}`, { silent: true });
  },
  getVehicle: (id) => request(`/vehicles/${id}`, { silent: true }),
  createVehicle: (body) =>
    request('/vehicles', {
      method: 'POST',
      body: JSON.stringify(body),
      successMessage: 'Vehicle created.',
    }),
  updateVehicle: (id, body) =>
    request(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      successMessage: 'Vehicle updated.',
    }),
  deleteVehicle: (id) =>
    request(`/vehicles/${id}`, {
      method: 'DELETE',
      successMessage: 'Vehicle deleted.',
    }),

  getErrors: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/errors${qs ? `?${qs}` : ''}`, { silent: true });
  },
  reportError: (body) =>
    request('/errors', {
      method: 'POST',
      body: JSON.stringify(body),
      silent: true,
      trackLoading: false,
    }),
  resolveError: (id) =>
    request(`/errors/${id}/resolve`, {
      method: 'POST',
      body: '{}',
      successMessage: 'X Error marked resolved.',
    }),
  resolveAllErrors: () =>
    request('/errors/resolve-all', {
      method: 'POST',
      body: '{}',
      successMessage: 'All open X Errors resolved.',
    }),

  getBackupStatus: () =>
    request('/backups/status', { silent: true, trackLoading: false }),
  getBackupLogs: () => request('/backups', { silent: true }),
  downloadDailyBackup: async (createdBy = 'staff') => {
    const qs = new URLSearchParams({ by: createdBy }).toString();
    const apiPath = `/api/backups/export?${qs}`;
    const loadingKey = `GET ${apiPath}`;
    beginLoading(loadingKey);
    try {
      let res;
      try {
        res = await fetch(`${API_BASE}${apiPath}`, {
          headers: { 'X-Falcon-User': createdBy },
        });
      } catch (networkErr) {
        emitNotice({
          status: 0,
          detail: networkErr.message,
          path: apiPath,
          method: 'GET',
          enabled: true,
        });
        throw new HttpError({ status: 0, detail: networkErr.message });
      }

      if (!res.ok) {
        const data = await parseBody(res);
        emitNotice({
          status: res.status,
          detail: data.error || data.message,
          path: apiPath,
          method: 'GET',
          enabled: true,
        });
        throw new HttpError({
          status: res.status,
          detail: data.error || 'Backup download failed',
          data,
        });
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename =
        res.headers.get('X-Falcon-Backup-Filename') ||
        match?.[1] ||
        `falcon-daily-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const log = await request('/backups/record', {
        method: 'POST',
        headers: { 'X-Falcon-User': createdBy },
        body: JSON.stringify({ filename, created_by: createdBy }),
        successMessage: `Backup saved as ${filename}.`,
      });
      return {
        filename: log.filename || filename,
        backed_up_at: log.backed_up_at,
        id: log.id,
      };
    } finally {
      endLoading(loadingKey);
    }
  },
};

export function formatMoney(value) {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value + (value.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(
    'en-GB',
    { day: '2-digit', month: 'short', year: 'numeric' }
  );
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}
