import { useEffect, useState } from 'react';
import { api, formatDate, formatMoney, todayISO } from '../api.js';

const CATEGORIES = [
  { id: 'paint', label: 'Paint' },
  { id: 'parts', label: 'Parts' },
  { id: 'consumables', label: 'Consumables' },
  { id: 'tools', label: 'Tools' },
  { id: 'chemicals', label: 'Chemicals' },
  { id: 'polish', label: 'Polish' },
  { id: 'other', label: 'Other' },
];

const emptyItem = {
  sku: '',
  name: '',
  category: 'parts',
  unit: 'Pcs',
  quantity_on_hand: 0,
  reorder_level: 0,
  cost_price: 0,
  sell_price: 0,
  supplier: '',
  location: '',
  notes: '',
  is_active: 1,
};

const emptyMove = {
  quantity: 1,
  unit_cost: '',
  reference: '',
  notes: '',
  movement_date: todayISO(),
  create_expense: false,
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [itemModal, setItemModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItem);

  const [stockModal, setStockModal] = useState(null); // { item, type: in|out|adjust }
  const [moveForm, setMoveForm] = useState(emptyMove);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      if (category) params.category = category;
      if (lowStockOnly) params.low_stock = '1';

      const [list, sum, moves] = await Promise.all([
        api.getInventory(params),
        api.getInventorySummary(),
        api.getInventoryMovements({ limit: 20 }),
      ]);
      setItems(list);
      setSummary(sum);
      setMovements(moves);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [category, lowStockOnly]);

  function openCreate() {
    setEditing(null);
    setItemForm({ ...emptyItem });
    setItemModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setItemForm({
      sku: item.sku || '',
      name: item.name || '',
      category: item.category || 'parts',
      unit: item.unit || 'Pcs',
      quantity_on_hand: item.quantity_on_hand ?? 0,
      reorder_level: item.reorder_level ?? 0,
      cost_price: item.cost_price ?? 0,
      sell_price: item.sell_price ?? 0,
      supplier: item.supplier || '',
      location: item.location || '',
      notes: item.notes || '',
      is_active: item.is_active ? 1 : 0,
    });
    setItemModal(true);
  }

  function openStock(item, type) {
    setStockModal({ item, type });
    setMoveForm({
      ...emptyMove,
      movement_date: todayISO(),
      quantity: type === 'adjust' ? item.quantity_on_hand : 1,
      unit_cost: item.cost_price || '',
      create_expense: type === 'in',
    });
  }

  async function saveItem(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...itemForm,
        quantity_on_hand: Number(itemForm.quantity_on_hand) || 0,
        reorder_level: Number(itemForm.reorder_level) || 0,
        cost_price: Number(itemForm.cost_price) || 0,
        sell_price: Number(itemForm.sell_price) || 0,
        is_active: itemForm.is_active ? 1 : 0,
      };
      if (editing) {
        const { quantity_on_hand, ...rest } = payload;
        await api.updateInventoryItem(editing.id, rest);
      } else {
        await api.createInventoryItem(payload);
      }
      setItemModal(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveStock(e) {
    e.preventDefault();
    setError('');
    const { item, type } = stockModal;
    const payload = {
      quantity: Number(moveForm.quantity),
      unit_cost:
        moveForm.unit_cost === '' ? undefined : Number(moveForm.unit_cost),
      reference: moveForm.reference,
      notes: moveForm.notes,
      movement_date: moveForm.movement_date,
      create_expense: Boolean(moveForm.create_expense),
    };
    try {
      if (type === 'in') await api.stockIn(item.id, payload);
      else if (type === 'out') await api.stockOut(item.id, payload);
      else await api.stockAdjust(item.id, payload);
      setStockModal(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" and its movement history?`)) {
      return;
    }
    try {
      await api.deleteInventoryItem(item.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>Track paint, parts, chemicals, and workshop consumables.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          Add item
        </button>
      </header>

      {summary && (
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Active items</p>
            <p className="stat-value">{summary.active_items}</p>
          </div>
          <div className="stat-card accent">
            <p className="stat-label">Stock value</p>
            <p className="stat-value">{formatMoney(summary.stock_value)}</p>
          </div>
          <div className="stat-card warn">
            <p className="stat-label">Low stock</p>
            <p className="stat-value">{summary.low_stock_count}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Categories</p>
            <p className="stat-value">{summary.by_category?.length || 0}</p>
          </div>
        </div>
      )}

      <section className="panel">
        <div className="toolbar">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Search name, SKU, supplier…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select
            className="select"
            style={{ maxWidth: 180 }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="checkbox-row" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />
            Low stock only
          </label>
          <button className="btn btn-ghost" onClick={load}>
            Search
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="empty">No inventory items found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>On hand</th>
                <th>Reorder</th>
                <th>Cost</th>
                <th>Sell</th>
                <th>Value</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.sku || '—'}</td>
                  <td>
                    <strong>{item.name}</strong>
                    {item.location ? (
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {item.location}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                  <td>
                    {item.quantity_on_hand} {item.unit}
                  </td>
                  <td>
                    {item.reorder_level} {item.unit}
                  </td>
                  <td>{formatMoney(item.cost_price)}</td>
                  <td>{formatMoney(item.sell_price)}</td>
                  <td>{formatMoney(item.stock_value)}</td>
                  <td>
                    {item.is_low_stock ? (
                      <span className="badge overdue">Low</span>
                    ) : (
                      <span className="badge paid">OK</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openStock(item, 'in')}
                      >
                        In
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openStock(item, 'out')}
                      >
                        Out
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openStock(item, 'adjust')}
                      >
                        Adjust
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(item)}
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

      <section className="panel" style={{ marginTop: 18 }}>
        <h2 className="section-title" style={{ fontSize: '1.6rem' }}>
          Recent movements
        </h2>
        {movements.length === 0 ? (
          <p className="empty">No stock movements yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Balance</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{formatDate(m.movement_date)}</td>
                  <td>
                    {m.item_name}
                    {m.item_sku ? (
                      <span className="muted"> · {m.item_sku}</span>
                    ) : null}
                  </td>
                  <td style={{ textTransform: 'uppercase' }}>{m.movement_type}</td>
                  <td>
                    {m.movement_type === 'out' ? '−' : m.movement_type === 'in' ? '+' : ''}
                    {Math.abs(m.quantity)} {m.item_unit}
                  </td>
                  <td>
                    {m.balance_after} {m.item_unit}
                  </td>
                  <td>{m.reference || m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {itemModal && (
        <div className="modal-backdrop" onClick={() => setItemModal(false)}>
          <div
            className="modal"
            style={{ width: 'min(720px, 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{editing ? 'Edit item' : 'New inventory item'}</h2>
            <form onSubmit={saveItem}>
              <div className="form-grid">
                <div className="field">
                  <label>SKU</label>
                  <input
                    className="input"
                    value={itemForm.sku}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, sku: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Name *</label>
                  <input
                    className="input"
                    required
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select
                    className="select"
                    value={itemForm.category}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, category: e.target.value }))
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Unit</label>
                  <input
                    className="input"
                    value={itemForm.unit}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, unit: e.target.value }))
                    }
                  />
                </div>
                {!editing && (
                  <div className="field">
                    <label>Opening qty</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemForm.quantity_on_hand}
                      onChange={(e) =>
                        setItemForm((p) => ({
                          ...p,
                          quantity_on_hand: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                <div className="field">
                  <label>Reorder level</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.reorder_level}
                    onChange={(e) =>
                      setItemForm((p) => ({
                        ...p,
                        reorder_level: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Cost price (AED)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.cost_price}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, cost_price: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Sell price (AED)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.sell_price}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, sell_price: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Supplier</label>
                  <input
                    className="input"
                    value={itemForm.supplier}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, supplier: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input
                    className="input"
                    value={itemForm.location}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, location: e.target.value }))
                    }
                  />
                </div>
                <div className="field span-2">
                  <label>Notes</label>
                  <textarea
                    className="textarea"
                    value={itemForm.notes}
                    onChange={(e) =>
                      setItemForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
                {editing && (
                  <label className="checkbox-row span-2">
                    <input
                      type="checkbox"
                      checked={Boolean(itemForm.is_active)}
                      onChange={(e) =>
                        setItemForm((p) => ({
                          ...p,
                          is_active: e.target.checked ? 1 : 0,
                        }))
                      }
                    />
                    Active item
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setItemModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stockModal && (
        <div className="modal-backdrop" onClick={() => setStockModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {stockModal.type === 'in'
                ? 'Stock in'
                : stockModal.type === 'out'
                  ? 'Stock out'
                  : 'Adjust stock'}{' '}
              — {stockModal.item.name}
            </h2>
            <p className="muted">
              Current on hand: {stockModal.item.quantity_on_hand}{' '}
              {stockModal.item.unit}
            </p>
            <form onSubmit={saveStock}>
              <div className="form-grid">
                <div className="field">
                  <label>
                    {stockModal.type === 'adjust'
                      ? 'New quantity on hand *'
                      : 'Quantity *'}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={moveForm.quantity}
                    onChange={(e) =>
                      setMoveForm((p) => ({ ...p, quantity: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Date *</label>
                  <input
                    className="input"
                    type="date"
                    required
                    value={moveForm.movement_date}
                    onChange={(e) =>
                      setMoveForm((p) => ({
                        ...p,
                        movement_date: e.target.value,
                      }))
                    }
                  />
                </div>
                {stockModal.type === 'in' && (
                  <div className="field">
                    <label>Unit cost (AED)</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={moveForm.unit_cost}
                      onChange={(e) =>
                        setMoveForm((p) => ({
                          ...p,
                          unit_cost: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                <div className="field">
                  <label>Reference</label>
                  <input
                    className="input"
                    placeholder={
                      stockModal.type === 'out'
                        ? 'Job / invoice no.'
                        : 'PO / invoice no.'
                    }
                    value={moveForm.reference}
                    onChange={(e) =>
                      setMoveForm((p) => ({ ...p, reference: e.target.value }))
                    }
                  />
                </div>
                <div className="field span-2">
                  <label>Notes</label>
                  <textarea
                    className="textarea"
                    value={moveForm.notes}
                    onChange={(e) =>
                      setMoveForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>
                {stockModal.type === 'in' && (
                  <label className="checkbox-row span-2">
                    <input
                      type="checkbox"
                      checked={moveForm.create_expense}
                      onChange={(e) =>
                        setMoveForm((p) => ({
                          ...p,
                          create_expense: e.target.checked,
                        }))
                      }
                    />
                    Also record as expense (qty × cost)
                  </label>
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStockModal(null)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary">Save movement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
