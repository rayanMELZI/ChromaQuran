/* The 8-point gold star emblem (two overlapping rounded squares + cyan center dot).
 * Reused in the app bar, the canvas watermark, and the account avatar. */
export function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.4" stroke="#dcc29c" strokeWidth="1.5" />
      <rect
        x="5.2"
        y="5.2"
        width="13.6"
        height="13.6"
        rx="2.4"
        stroke="#dcc29c"
        strokeWidth="1.5"
        transform="rotate(45 12 12)"
      />
      <circle cx="12" cy="12" r="2" fill="#69c0e6" />
    </svg>
  );
}
