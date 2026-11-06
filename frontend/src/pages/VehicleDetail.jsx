import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatDate, formatMoney } from '../api.js';

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('services');

  useEffect(() => {
    api
      .getVehicle(id)
      .then(setVehicle)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleDelete() {
    if (
      !window.confirm(
        'Delete this vehicle record? Invoices stay, but the vehicle link is removed.'
      )
    ) {
      return;
    }
    try {
      await api.deleteVehicle(id);
      navigate('/app/vehicles');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !vehicle) return <div className="error-banner">{error}</div>;
  if (!vehicle) return <p className="muted">Loading vehicle…</p>;

  const summary = vehicle.summary || {};
  const title =
    [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
    vehicle.plate_number ||
    `Vehicle #${vehicle.id}`;

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>
            {vehicle.plate_number ? `Plate ${vehicle.plate_number}` : 'No plate'}
            {vehicle.customer_name ? ` · ${vehicle.customer_name}` : ''}
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn btn-ghost" to="/app/vehicles">
            Back
          </Link>
          <Link
            className="btn btn-primary"
            to="/app/invoices/new"
          >
            New invoice
          </Link>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Visits</p>
          <p className="stat-value">{summary.visit_count || 0}</p>
        </div>
        <div className="stat-card accent">
          <p className="stat-label">Total job value</p>
          <p className="stat-value">{formatMoney(summary.total_spent)}</p>
        </div>
        <div className="stat-card ok">
          <p className="stat-label">Paid</p>
          <p className="stat-value">{formatMoney(summary.paid_spent)}</p>
        </div>
        <div className="stat-card warn">
          <p className="stat-label">Outstanding</p>
          <p className="stat-value">{formatMoney(summary.outstanding)}</p>
        </div>
      </div>

      <section className="panel">
        <div className="meta-grid">
          <div className="meta-card">
            <h3>Vehicle</h3>
            <p>
              <strong>{title}</strong>
            </p>
            <p>Plate: {vehicle.plate_number || '—'}</p>
            <p>VIN: {vehicle.vin || '—'}</p>
            <p>Mileage: {vehicle.mileage || '—'}</p>
          </div>
          <div className="meta-card">
            <h3>Owner</h3>
            <p>
              <strong>{vehicle.customer_name || '—'}</strong>
            </p>
            <p>{vehicle.customer_phone || '—'}</p>
            <p>{vehicle.customer_email || '—'}</p>
          </div>
          <div className="meta-card">
            <h3>Garage history</h3>
            <p>First visit: {formatDate(summary.first_visit)}</p>
            <p>Last visit: {formatDate(summary.last_visit)}</p>
            <p>Service lines: {(vehicle.services || []).length}</p>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'services' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('services')}
          >
            Service history
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === 'invoices' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('invoices')}
          >
            Invoices
          </button>
        </div>

        {tab === 'services' ? (
          (vehicle.services || []).length === 0 ? (
            <p className="empty">No services recorded for this vehicle yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Service / part</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.services.map((line, idx) => (
                  <tr key={`${line.invoice_id}-${idx}`}>
                    <td>{formatDate(line.issue_date)}</td>
                    <td>
                      <Link to={`/app/invoices/${line.invoice_id}`}>
                        {line.invoice_number}
                      </Link>
                    </td>
                    <td>{line.description}</td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {line.item_type}
                    </td>
                    <td>
                      {line.quantity} {line.unit}
                    </td>
                    <td>{formatMoney(line.amount)}</td>
                    <td>
                      <span className={`badge ${line.status}`}>{line.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (vehicle.invoices || []).length === 0 ? (
          <p className="empty">No invoices linked to this vehicle.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Job order</th>
                <th>Mileage</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {vehicle.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link to={`/app/invoices/${inv.id}`}>{inv.invoice_number}</Link>
                  </td>
                  <td>{formatDate(inv.issue_date)}</td>
                  <td>{inv.job_order_no || '—'}</td>
                  <td>{inv.mileage || '—'}</td>
                  <td>
                    <span className={`badge ${inv.status}`}>{inv.status}</span>
                  </td>
                  <td>{formatMoney(inv.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
