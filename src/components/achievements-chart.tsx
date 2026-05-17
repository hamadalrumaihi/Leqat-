'use client';

import { useLocale } from 'next-intl';
import { toNumerals } from '@/lib/utils';

// Semester participant growth 2017–2025 (≈2 → ≈250), from the profile.
const DATA: [string, number][] = [
  ['2017', 2],
  ['2018', 20],
  ['2019', 45],
  ['2020', 60],
  ['2021', 90],
  ['2022', 130],
  ['2023', 175],
  ['2024', 215],
  ['2025', 250],
];

export function AchievementsChart() {
  const locale = useLocale();
  const pref = locale === 'ar' ? 'arabic' : 'latin';
  const max = Math.max(...DATA.map((d) => d[1]));

  return (
    <div className="card p-6">
      <div className="flex items-end justify-between gap-2">
        {DATA.map(([year, value]) => (
          <div key={year} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-medium text-primary">
              {toNumerals(value, pref)}
            </span>
            <div
              className="w-full rounded-t bg-gradient-to-t from-green-deep to-green-vibrant transition-all"
              style={{ height: `${Math.max((value / max) * 200, 4)}px` }}
            />
            <span className="latin-term text-[11px] text-muted-foreground">{year}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
