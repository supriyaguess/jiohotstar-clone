import { useId } from 'react';

// Original brand mark: gradient tile with a star (theme colours, not the official JioHotstar artwork).
export function LogoMark({ size = 32, className = '' }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`flex-shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1492ff" />
          <stop offset="0.5" stopColor="#0860c4" />
          <stop offset="1" stopColor="#eb0066" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      <path
        d="M16 6.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L16 20.3l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
        fill="#fff"
      />
    </svg>
  );
}

export function Wordmark({ className = 'text-xl' }) {
  return (
    <span className={`font-black tracking-tight whitespace-nowrap ${className}`}>
      <span className="text-blue-400">Jio</span>
      <span className="gradient-text">Hotstar</span>
    </span>
  );
}

export default function Logo({ size = 32, textClass = 'text-xl', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <Wordmark className={textClass} />
    </span>
  );
}
