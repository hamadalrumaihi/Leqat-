import { BRAND_GREEN } from '@/lib/utils';

// Small circular swatch shown before a group name. Falls back to the
// brand deep green when no color is set.
export function GroupSwatch({
  color,
  className = '',
}: {
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: color || BRAND_GREEN }}
    />
  );
}
