import { useEffect, useState } from 'react';
import { api, formatDateTime } from '../api.js';

export default function Errors() {
  const [errors, setErrors] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [source, setSource] = useState('');
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(next = { source, unresolvedOnly }) {
    setLoading(true);
    setError('');
    try {
      const params = { limit: '200' };
      if (next.source) params.source = next.source;
      if (next.unresolvedOnly) params.unresolved = '1';
      const data = await api.getErrors(params);
      setErrors(data.errors || []);
      setOpenCount(data.open_count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function resolveOne(id) {
    setBusy(true);
    try {
      await api.resolveError(id);
      if (selected?.id === id) setSelected(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resolveAll() {
    if (!window.confirm('Mark all open X Errors as resolved?')) return;
    setBusy(true);
    try {
      await api.resolveAllErrors();
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Errors</h1>
          <p>
            Monitored failures from the Render backend and this app — each row
            is marked <strong>X Error</strong>.
          </p>
        </div>
        <div className="row-actions">
          <button className="btn btn-ghost" disabled={busy} onClick={() => load()}>
            Refresh
          </button>
          <button
            className="btn btn-ghost"
            disabled={busy || openCount === 0}
            onClick={resolveAll}
          >
            Resolve all open
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="toolbar">
          <select
            className="select"
            style={{ maxWidth: 180 }}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">All sources</option>
            <option value="backend">Backend (Render)</option>
            <option value="frontend">Frontend</option>
          </select>
          <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={unresolvedOnly}
              onChange={(e) => setUnresolvedOnly(e.target.checked)}
            />
            Open only
          </label>
          <button
            className="btn btn-ghost"
            onClick={() => load({ source, unresolvedOnly })}
          >
            Apply
          </button>
          <span className="badge danger" style={{ marginLeft: 'auto' }}>
            {openCount} open X Error{openCount === 1 ? '' : 's'}
          </span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : errors.length === 0 ? (
          <p className="empty">No errors recorded.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Mark</th>
                <th>Source</th>
                <th>Message</th>
                <th>Path</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {errors.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>
                    <span className="badge danger">{row.mark || 'X Error'}</span>
                  </td>
                  <td>{row.source}</td>
                  <td>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => setSelected(row)}
                      style={{
                        background: 'none',
                        border: 0,
                        padding: 0,
                        color: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                        font: 'inherit',
                      }}
                    >
                      {row.message}
                    </button>
                  </td>
                  <td>
                    {row.method ? `${row.method} ` : ''}
                    {row.path || '—'}
                  </td>
                  <td>
                    {!row.resolved_at && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => resolveOne(row.id)}
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selected && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="row-actions" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
              X Error #{selected.id}
            </h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <p style={{ margin: '0 0 8px' }}>
            <strong>{selected.name || 'Error'}</strong> · {selected.source}
            {selected.resolved_at
              ? ` · resolved ${formatDateTime(selected.resolved_at)}`
              : ' · open'}
          </p>
          <p style={{ margin: '0 0 12px' }}>{selected.message}</p>
          {selected.stack && (
            <pre
              style={{
                margin: 0,
                padding: 12,
                overflow: 'auto',
                maxHeight: 320,
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
              }}
            >
              {selected.stack}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
