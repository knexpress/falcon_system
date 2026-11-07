import { useEffect, useState } from 'react';
import { Lottie } from 'lottie-react';
import { subscribeNotify } from '../notify.js';

export default function HttpNotifyHost() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    return subscribeNotify((next) => {
      setNotice(next);
    });
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    // Auto-dismiss success/info; keep errors until closed
    if (notice.kind === 'error') return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  const tone =
    notice.kind === 'success'
      ? 'ok'
      : notice.kind === 'info'
        ? 'info'
        : 'danger';

  return (
    <div
      className="http-notify-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="http-notify-title"
      onClick={() => setNotice(null)}
    >
      <div
        className={`http-notify-dialog http-notify-${tone}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="http-notify-car" aria-hidden="true">
          <Lottie
            src="/car.json"
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div className="http-notify-code">{notice.title}</div>
        <h2 id="http-notify-title">
          {notice.kind === 'success'
            ? 'Request succeeded'
            : notice.kind === 'info'
              ? 'Response notice'
              : 'Request failed'}
        </h2>
        <p className="http-notify-reason">{notice.reason}</p>
        {notice.detail && (
          <p className="http-notify-detail">
            <strong>Details:</strong> {notice.detail}
          </p>
        )}
        {(notice.method || notice.path) && (
          <p className="http-notify-meta muted">
            {notice.method ? `${notice.method} ` : ''}
            {notice.path || ''}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setNotice(null)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
