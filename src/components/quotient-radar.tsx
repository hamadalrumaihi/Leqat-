// Per-child exposure across the four quotients this semester.
// Pure SVG radar — no deps.
import { QUOTIENT_NAME } from '@/lib/utils';

const AXES = ['SQ', 'EQ', 'IQ', 'PQ'] as const;

export function QuotientRadar({
  values,
}: {
  values: Record<(typeof AXES)[number], number>;
}) {
  const max = Math.max(...Object.values(values), 1);
  const cx = 100;
  const cy = 100;
  const r = 80;

  const point = (i: number, frac: number) => {
    const angle = (Math.PI / 2) * i - Math.PI / 2;
    return [cx + Math.cos(angle) * r * frac, cy + Math.sin(angle) * r * frac];
  };

  const poly = AXES.map((q, i) => point(i, values[q] / max).join(',')).join(' ');

  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-56 w-56" role="img" aria-label="Quotient radar">
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <polygon
          key={g}
          points={AXES.map((_, i) => point(i, g).join(',')).join(' ')}
          fill="none"
          stroke="hsl(var(--border))"
        />
      ))}
      <polygon points={poly} fill="hsl(var(--primary) / 0.25)" stroke="hsl(var(--primary))" strokeWidth="2" />
      {AXES.map((q, i) => {
        const [x, y] = point(i, 1.18);
        return (
          <g key={q}>
            <text x={x} y={y - 4} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[10px] font-bold">
              {q}
            </text>
            <text x={x} y={y + 6} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[7px] opacity-70">
              {QUOTIENT_NAME[q]?.ar}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
