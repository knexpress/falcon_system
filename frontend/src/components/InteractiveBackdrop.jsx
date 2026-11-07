import { useEffect, useRef } from 'react';

/**
 * Pointer-reactive canvas backdrop: soft orbs + drifting sparks follow the cursor.
 */
export default function InteractiveBackdrop() {
  const canvasRef = useRef(null);
  const pointer = useRef({ x: 0.5, y: 0.45, tx: 0.5, ty: 0.45 });
  const sparks = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let raf = 0;
    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seedSparks() {
      const count = Math.max(28, Math.floor((w * h) / 38000));
      sparks.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 2.4,
        vx: -0.25 + Math.random() * 0.5,
        vy: -0.15 + Math.random() * 0.35,
        a: 0.15 + Math.random() * 0.45,
      }));
    }

    function onMove(e) {
      pointer.current.tx = e.clientX / w;
      pointer.current.ty = e.clientY / h;
    }

    function onTouch(e) {
      const t = e.touches[0];
      if (!t) return;
      pointer.current.tx = t.clientX / w;
      pointer.current.ty = t.clientY / h;
    }

    function tick() {
      frame += 1;
      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.06;
      p.y += (p.ty - p.y) * 0.06;

      ctx.clearRect(0, 0, w, h);

      // Base wash
      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, '#1a1c1a');
      base.addColorStop(0.45, '#242821');
      base.addColorStop(1, '#151815');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      // Cursor-led amber orb
      const ox = p.x * w;
      const oy = p.y * h;
      const orb = ctx.createRadialGradient(ox, oy, 20, ox, oy, Math.max(w, h) * 0.42);
      orb.addColorStop(0, 'rgba(196, 92, 38, 0.38)');
      orb.addColorStop(0.35, 'rgba(196, 92, 38, 0.12)');
      orb.addColorStop(1, 'rgba(196, 92, 38, 0)');
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, w, h);

      // Secondary cool orb opposite cursor
      const sx = (1 - p.x) * w;
      const sy = (1 - p.y) * h * 0.85;
      const cool = ctx.createRadialGradient(sx, sy, 10, sx, sy, Math.max(w, h) * 0.35);
      cool.addColorStop(0, 'rgba(47, 107, 79, 0.28)');
      cool.addColorStop(1, 'rgba(47, 107, 79, 0)');
      ctx.fillStyle = cool;
      ctx.fillRect(0, 0, w, h);

      // Road-like horizon shimmer
      const roadY = h * 0.72 + Math.sin(frame / 40) * 6;
      const road = ctx.createLinearGradient(0, roadY - 40, 0, h);
      road.addColorStop(0, 'rgba(243, 239, 231, 0)');
      road.addColorStop(0.35, 'rgba(243, 239, 231, 0.04)');
      road.addColorStop(1, 'rgba(243, 239, 231, 0.09)');
      ctx.fillStyle = road;
      ctx.fillRect(0, roadY - 40, w, h - roadY + 40);

      // Sparks drift + slight attraction to pointer
      for (const s of sparks.current) {
        const dx = ox - s.x;
        const dy = oy - s.y;
        s.vx += dx * 0.00001;
        s.vy += dy * 0.00001;
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;

        ctx.beginPath();
        ctx.fillStyle = `rgba(247, 244, 238, ${s.a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = window.requestAnimationFrame(tick);
    }

    function onResize() {
      resize();
      seedSparks();
    }

    resize();
    seedSparks();
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="nf-backdrop"
      aria-hidden="true"
    />
  );
}
