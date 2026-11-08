const LOGO_SRC = '/falcon-revive-emblem.png';

export default function BrandLogo({
  className = '',
  alt = 'Falcon Revive',
  decorative = false,
}) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src={LOGO_SRC}
      alt={decorative ? '' : alt}
      draggable={false}
    />
  );
}
