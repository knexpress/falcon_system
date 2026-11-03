import { useEffect, useState } from 'react';
import { api } from '../api.js';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  trn: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      setCustomers(await api.getCustomers());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      trn: customer.trn || '',
    });
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateCustomer(editingId, form);
      } else {
        await api.createCustomer(form);
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete customer ${name}?`)) return;
    try {
      await api.deleteCustomer(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Customers</h1>
          <p>People and fleets you invoice for garage work.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          Add customer
        </button>
      </header>

      <section className="panel">
        {error && <div className="error-banner">{error}</div>}
        {customers.length === 0 ? (
          <p className="empty">No customers yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>TRN / ID</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.trn || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.address || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(c.id, c.name)}
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
            <h2>{editingId ? 'Edit customer' : 'New customer'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field span-2">
                  <label>Name *</label>
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>TRN / ID No.</label>
                  <input
                    className="input"
                    value={form.trn}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, trn: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="field span-2">
                  <label>Email</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>
                <div className="field span-2">
                  <label>Address</label>
                  <textarea
                    className="textarea"
                    value={form.address}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, address: e.target.value }))
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
