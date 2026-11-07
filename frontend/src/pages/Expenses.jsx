import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api, formatDate, formatMoney, todayISO } from '../api.js';

const emptyForm = {
  expense_date: todayISO(),
  description: '',
  category: 'parts',
  amount: '',
  vendor: '',
  payment_method: 'cash',
  notes: '',
};

export default function Expenses() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const journalReturn = location.state?.journalReturn;
  const focusId = searchParams.get('focus');
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const rows = await api.getExpenses();
      setExpenses(rows);
      return rows;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }

  useEffect(() => {
    load().then((rows) => {
      if (!focusId) return;
      const match = rows.find((e) => String(e.id) === String(focusId));
      if (match) openEdit(match);
    });
  }, [focusId]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, expense_date: todayISO() });
    setOpen(true);
  }

  function openEdit(expense) {
    setEditingId(expense.id);
    setForm({
      expense_date: expense.expense_date,
      description: expense.description || '',
      category: expense.category || 'parts',
      amount: expense.amount,
      vendor: expense.vendor || '',
      payment_method: expense.payment_method || 'cash',
      notes: expense.notes || '',
    });
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, amount: Number(form.amount) };
    try {
      if (editingId) await api.updateExpense(editingId, payload);
      else await api.createExpense(payload);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Track parts purchases, rent, utilities, and workshop costs.</p>
        </div>
        <div className="row-actions">
          {journalReturn && (
            <Link className="btn btn-ghost" to={journalReturn}>
              ← Back to journal
            </Link>
          )}
          <button className="btn btn-primary" onClick={openCreate}>
            Add expense
          </button>
        </div>
      </header>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card warn">
          <p className="stat-label">Total expenses</p>
          <p className="stat-value">{formatMoney(total)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Records</p>
          <p className="stat-value">{expenses.length}</p>
        </div>
      </div>

      <section className="panel">
        {error && <div className="error-banner">{error}</div>}
        {expenses.length === 0 ? (
          <p className="empty">No expenses recorded.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Method</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.expense_date)}</td>
                  <td>{expense.description}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {expense.category}
                  </td>
                  <td>{expense.vendor || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {expense.payment_method}
                  </td>
                  <td>{formatMoney(expense.amount)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(expense)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(expense.id)}
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
            <h2>{editingId ? 'Edit expense' : 'New expense'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Date *</label>
                  <input
                    className="input"
                    type="date"
                    required
                    value={form.expense_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        expense_date: e.target.value,
                      }))
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
                    <option value="parts">Parts</option>
                    <option value="rent">Rent</option>
                    <option value="utilities">Utilities</option>
                    <option value="wages">Wages</option>
                    <option value="tools">Tools</option>
                    <option value="marketing">Marketing</option>
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
                  </select>
                </div>
                <div className="field span-2">
                  <label>Vendor</label>
                  <input
                    className="input"
                    value={form.vendor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, vendor: e.target.value }))
                    }
                  />
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
