const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  login: (body) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  getDashboard: () => request('/dashboard'),

  getJournal: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/journal${qs ? `?${qs}` : ''}`);
  },

  getCustomers: () => request('/customers'),
  createCustomer: (body) =>
    request('/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id, body) =>
    request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  getInvoices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/invoices${qs ? `?${qs}` : ''}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (body) =>
    request('/invoices', { method: 'POST', body: JSON.stringify(body) }),
  updateInvoice: (id, body) =>
    request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteInvoice: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  downloadInvoicePdf: async (id, filename = 'invoice.pdf') => {
    const res = await fetch(`${API_BASE}/api/invoices/${id}/pdf`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to download PDF');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  getSales: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sales${qs ? `?${qs}` : ''}`);
  },
  getSale: (id) => request(`/sales/${id}`),
  createSale: (body) =>
    request('/sales', { method: 'POST', body: JSON.stringify(body) }),
  updateSale: (id, body) =>
    request(`/sales/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSale: (id) => request(`/sales/${id}`, { method: 'DELETE' }),

  getExpenses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/expenses${qs ? `?${qs}` : ''}`);
  },
  getExpense: (id) => request(`/expenses/${id}`),
  createExpense: (body) =>
    request('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  updateExpense: (id, body) =>
    request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  getInventory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory${qs ? `?${qs}` : ''}`);
  },
  getInventorySummary: () => request('/inventory/summary'),
  getInventoryItem: (id) => request(`/inventory/${id}`),
  getInventoryMovements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory/movements${qs ? `?${qs}` : ''}`);
  },
  createInventoryItem: (body) =>
    request('/inventory', { method: 'POST', body: JSON.stringify(body) }),
  updateInventoryItem: (id, body) =>
    request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteInventoryItem: (id) =>
    request(`/inventory/${id}`, { method: 'DELETE' }),
  stockIn: (id, body) =>
    request(`/inventory/${id}/stock-in`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  stockOut: (id, body) =>
    request(`/inventory/${id}/stock-out`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  stockAdjust: (id, body) =>
    request(`/inventory/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getVehicles: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/vehicles${qs ? `?${qs}` : ''}`);
  },
  getVehicle: (id) => request(`/vehicles/${id}`),
  createVehicle: (body) =>
    request('/vehicles', { method: 'POST', body: JSON.stringify(body) }),
  updateVehicle: (id, body) =>
    request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),
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
