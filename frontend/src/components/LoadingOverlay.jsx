import { useEffect, useState } from 'react';
import { Lottie } from 'lottie-react';
import { subscribeLoading } from '../loading.js';

export default function LoadingOverlay() {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return subscribeLoading((state) => setBusy(state.busy));
  }, []);

  if (!busy) return null;

  return (
    <div className="app-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="app-loading-card">
        <div className="app-loading-car" aria-hidden="true">
          <Lottie
            src="/car-lottie.json"
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div className="app-loading-spinner" aria-hidden="true">
          <Lottie
            src="/loading-animation.json"
            loop
            autoplay
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <p className="app-loading-label">Loading data…</p>
      </div>
    </div>
  );
}
