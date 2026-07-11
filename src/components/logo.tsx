// Compass-inspired mark. Concentric rings echo the brand palette:
// formation → values forming → character strengthening → empowerment.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="برنامج مهندس الحياة">
      <circle cx="32" cy="32" r="30" fill="none" stroke="#8A8F98" strokeWidth="2" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#A7D7A0" strokeWidth="3" />
      <circle cx="32" cy="32" r="13" fill="none" stroke="#1F5C3A" strokeWidth="3" />
      <path
        d="M32 8 L38 32 L32 56 L26 32 Z"
        fill="#3FA34D"
      />
      <path d="M8 32 L32 26 L56 32 L32 38 Z" fill="#1F5C3A" opacity="0.85" />
      <circle cx="32" cy="32" r="4" fill="#FFFFFF" stroke="#1F5C3A" strokeWidth="2" />
    </svg>
  );
}
