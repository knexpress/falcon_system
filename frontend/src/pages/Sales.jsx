import { useEffect, useState } from 'react';
import { api, formatDate, formatMoney, todayISO } from '../api.js';

const emptyForm = {
  sale_date: todayISO(),
  description: '',
  category: 'service',
  amount: '',
  payment_method: 'cash',
  notes: '',
};

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      setSales(await api.getSales());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const total = sales.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sale_date: todayISO() });
    setOpen(true);
  }

  function openEdit(sale) {
    setEditingId(sale.id);
    setForm({
      sale_date: sale.sale_date,
      description: sale.description || '',
      category: sale.category || 'service',
      amount: sale.amount,
      payment_method: sale.payment_method || 'cash',
      notes: sale.notes || '',
    });
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, amount: Number(form.amount) };
    try {
      if (editingId) await api.updateSale(editingId, payload);
      else await api.createSale(payload);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this sale record?')) return;
    try {
      await api.deleteSale(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Sales</h1>
          <p>Income from jobs, walk-ins, and paid invoices.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          Add sale
        </button>
      </header>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card accent">
          <p className="stat-label">Total sales</p>
          <p className="stat-value">{formatMoney(total)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Records</p>
          <p className="stat-value">{sales.length}</p>
        </div>
      </div>

      <section className="panel">
        {error && <div className="error-banner">{error}</div>}
        {sales.length === 0 ? (
          <p className="empty">No sales recorded.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Invoice</th>
                <th>Method</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDate(sale.sale_date)}</td>
                  <td>{sale.description}</td>
                  <td style={{ textTransform: 'capitalize' }}>{sale.category}</td>
                  <td>{sale.invoice_number || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {sale.payment_method}
                  </td>
                  <td>{formatMoney(sale.amount)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(sale)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(sale.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? 'Edit sale' : 'New sale'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Date *</label>
                  <input
                    className="input"
                    type="date"
                    required
                    value={form.sale_date}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, sale_date: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Amount *</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                  />
                </div>
                <div className="field span-2">
                  <label>Description *</label>
                  <input
                    className="input"
                    required
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select
                    className="select"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                  >
                    <option value="service">Service</option>
                    <option value="parts">Parts</option>
                    <option value="invoice">Invoice payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Payment method</label>
                  <select
                    className="select"
                    value={form.payment_method}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        payment_method: e.target.value,
                      }))
                    }
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank</option>
                    <option value="invoice">Invoice</option>
                  </select>
                </div>
                <div className="field span-2">
                  <label>Notes</label>
                  <textarea
                    className="textarea"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
