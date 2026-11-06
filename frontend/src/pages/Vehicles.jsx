import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (q.trim()) params.q = q.trim();
      setVehicles(await api.getVehicles(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalSpend = vehicles.reduce(
    (sum, v) => sum + Number(v.total_spent || 0),
    0
  );

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Vehicles</h1>
          <p>
            Cars are saved automatically from invoice details. Open a vehicle to
            see full service history and spend.
          </p>
        </div>
      </header>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="stat-card">
          <p className="stat-label">Vehicles</p>
          <p className="stat-value">{vehicles.length}</p>
        </div>
        <div className="stat-card accent">
          <p className="stat-label">Lifetime job value</p>
          <p className="stat-value">{formatMoney(totalSpend)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Total visits</p>
          <p className="stat-value">
            {vehicles.reduce((s, v) => s + Number(v.visit_count || 0), 0)}
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="toolbar">
          <input
            className="input"
            style={{ maxWidth: 320 }}
            placeholder="Search plate, make, model, customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <button className="btn btn-ghost" onClick={load}>
            Search
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : vehicles.length === 0 ? (
          <p className="empty">
            No vehicles yet. Create an invoice with vehicle details and it will
            appear here.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plate</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Visits</th>
                <th>Total spent</th>
                <th>Paid</th>
                <th>Last visit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.plate_number || '—'}</strong>
                  </td>
                  <td>
                    {[v.year, v.make, v.model].filter(Boolean).join(' ') || '—'}
                    {v.mileage ? (
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        Mileage: {v.mileage}
                      </div>
                    ) : null}
                  </td>
                  <td>{v.customer_name || '—'}</td>
                  <td>{v.visit_count || 0}</td>
                  <td>{formatMoney(v.total_spent)}</td>
                  <td>{formatMoney(v.paid_spent)}</td>
                  <td>{formatDate(v.last_visit)}</td>
                  <td>
                    <Link className="btn btn-ghost btn-sm" to={`/app/vehicles/${v.id}`}>
                      History
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
