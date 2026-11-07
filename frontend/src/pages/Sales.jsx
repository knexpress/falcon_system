import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api, formatDate, formatMoney, todayISO } from '../api.js';

const emptyForm = {
  sale_date: todayISO(),
  description: '',
  category: 'service',
  amount: '',
  payment_method: 'cash',
  notes: '',
};

const emptyInventorySale = {
  item_id: '',
  quantity: '1',
  unit_price: '',
  sale_date: todayISO(),
  payment_method: 'cash',
  notes: '',
};

export default function Sales() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const journalReturn = location.state?.journalReturn;
  const focusId = searchParams.get('focus');
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [invForm, setInvForm] = useState(emptyInventorySale);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [salesRows, items] = await Promise.all([
        api.getSales(),
        api.getInventory({ active: '1' }),
      ]);
      setSales(salesRows);
      setInventory(items);
      return salesRows;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }

  useEffect(() => {
    load().then((rows) => {
      if (!focusId) return;
      const match = rows.find((s) => String(s.id) === String(focusId));
      if (match && !match.invoice_id) openEdit(match);
    });
  }, [focusId]);

  const sellableItems = useMemo(
    () => inventory.filter((item) => Number(item.quantity_on_hand) > 0),
    [inventory]
  );

  const selectedItem = useMemo(
    () => sellableItems.find((i) => String(i.id) === String(invForm.item_id)),
    [sellableItems, invForm.item_id]
  );

  const invQty = Number(invForm.quantity) || 0;
  const invPrice = Number(invForm.unit_price) || 0;
  const invTotal = Math.round(invQty * invPrice * 100) / 100;

  const invoiceIncome = sales
    .filter((s) => s.invoice_id)
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const otherSales = sales
    .filter((s) => !s.invoice_id)
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const total = invoiceIncome + otherSales;

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, sale_date: todayISO() });
    setOpen(true);
  }

  function openInventorySale() {
    setInvForm({ ...emptyInventorySale, sale_date: todayISO() });
    setInvOpen(true);
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

  function selectInventoryItem(itemId) {
    const item = sellableItems.find((i) => String(i.id) === String(itemId));
    setInvForm((prev) => ({
      ...prev,
      item_id: itemId,
      unit_price: item ? String(item.sell_price ?? '') : '',
      quantity: '1',
    }));
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

  async function handleInventorySale(e) {
    e.preventDefault();
    setError('');
    if (!invForm.item_id) {
      setError('Select an inventory product.');
      return;
    }
    if (invQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (selectedItem && invQty > Number(selectedItem.quantity_on_hand)) {
      setError(
        `Insufficient stock. Available: ${selectedItem.quantity_on_hand} ${selectedItem.unit}`
      );
      return;
    }

    setSaving(true);
    try {
      await api.stockOut(invForm.item_id, {
        quantity: invQty,
        unit_price: invPrice,
        movement_date: invForm.sale_date,
        payment_method: invForm.payment_method,
        create_sale: true,
        reference: 'Inventory sale',
        notes: invForm.notes || null,
      });
      setInvOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
          <h1>Sales / Income</h1>
          <p>
            Paid invoices count as income automatically. Sell stock products or
            add walk-in sales separately.
          </p>
        </div>
        <div className="row-actions">
          {journalReturn && (
            <Link className="btn btn-ghost" to={journalReturn}>
              ← Back to journal
            </Link>
          )}
          <button className="btn btn-ghost" onClick={openInventorySale}>
            Sell from inventory
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            Add walk-in sale
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card accent">
          <p className="stat-label">Invoice income</p>
          <p className="stat-value">{formatMoney(invoiceIncome)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Walk-in / other</p>
          <p className="stat-value">{formatMoney(otherSales)}</p>
        </div>
        <div className="stat-card ok">
          <p className="stat-label">Total income</p>
          <p className="stat-value">{formatMoney(total)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Records</p>
          <p className="stat-value">{sales.length}</p>
        </div>
      </div>

      <section className="panel">
        {error && !open && !invOpen && (
          <div className="error-banner">{error}</div>
        )}
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
            <h2>{editingId ? 'Edit sale' : 'New walk-in sale'}</h2>
            {error && <div className="error-banner">{error}</div>}
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

      {invOpen && (
        <div className="modal-backdrop" onClick={() => setInvOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Sell from inventory</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Deducts stock and records the sale as income.
            </p>
            {error && <div className="error-banner">{error}</div>}
            {sellableItems.length === 0 ? (
              <p className="empty">No products with stock available.</p>
            ) : (
              <form onSubmit={handleInventorySale}>
                <div className="form-grid">
                  <div className="field span-2">
                    <label>Product *</label>
                    <select
                      className="select"
                      required
                      value={invForm.item_id}
                      onChange={(e) => selectInventoryItem(e.target.value)}
                    >
                      <option value="">Select product…</option>
                      {sellableItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {item.sku ? ` (${item.sku})` : ''} —{' '}
                          {item.quantity_on_hand} {item.unit} in stock
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Quantity *</label>
                    <input
                      className="input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      max={selectedItem?.quantity_on_hand || undefined}
                      value={invForm.quantity}
                      onChange={(e) =>
                        setInvForm((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                    />
                    {selectedItem && (
                      <p className="muted" style={{ margin: '6px 0 0' }}>
                        Available: {selectedItem.quantity_on_hand}{' '}
                        {selectedItem.unit}
                      </p>
                    )}
                  </div>
                  <div className="field">
                    <label>Unit price (AED) *</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={invForm.unit_price}
                      onChange={(e) =>
                        setInvForm((prev) => ({
                          ...prev,
                          unit_price: e.target.value,
                        }))
                      }
                    />
                    {selectedItem && (
                      <p className="muted" style={{ margin: '6px 0 0' }}>
                        List price: {formatMoney(selectedItem.sell_price || 0)}
                      </p>
                    )}
                  </div>
                  <div className="field">
                    <label>Date *</label>
                    <input
                      className="input"
                      type="date"
                      required
                      value={invForm.sale_date}
                      onChange={(e) =>
                        setInvForm((prev) => ({
                          ...prev,
                          sale_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Payment method</label>
                    <select
                      className="select"
                      value={invForm.payment_method}
                      onChange={(e) =>
                        setInvForm((prev) => ({
                          ...prev,
                          payment_method: e.target.value,
                        }))
                      }
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank">Bank</option>
                    </select>
                  </div>
                  <div className="field span-2">
                    <label>Notes</label>
                    <textarea
                      className="textarea"
                      value={invForm.notes}
                      onChange={(e) =>
                        setInvForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field span-2">
                    <div className="stat-card accent" style={{ margin: 0 }}>
                      <p className="stat-label">Sale total</p>
                      <p className="stat-value">{formatMoney(invTotal)}</p>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setInvOpen(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Record sale & deduct stock'}
                  </button>
                </div>
              </form>
            )}
            {sellableItems.length === 0 && (
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setInvOpen(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
