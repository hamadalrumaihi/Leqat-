import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { QUOTIENT_NAME } from '@/lib/utils';

export default async function AnalyticsPage() {
  const t = await getTranslations('dashboard');
  const supabase = await createClient();

  const { data: rows } = await supabase.from('attendance').select('status');
  const counts = { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>;
  for (const r of rows ?? []) counts[r.status as string] = (counts[r.status as string] ?? 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const rate = Math.round(((counts.present + counts.late) / total) * 100);

  const { data: reports } = await supabase.from('reports').select('quotient_tags');
  const qc: Record<string, number> = { SQ: 0, EQ: 0, IQ: 0, PQ: 0 };
  for (const r of reports ?? [])
    for (const q of (r.quotient_tags as string[]) ?? []) qc[q] = (qc[q] ?? 0) + 1;

  const { data: fb } = await supabase.from('session_feedback').select('rating');
  const fbCount = (fb ?? []).length;
  const fbAvg = fbCount
    ? Math.round(((fb ?? []).reduce((a, r) => a + Number(r.rating), 0) / fbCount) * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('analytics')}</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-muted-foreground">نسبة الحضور</p>
          <p className="mt-1 text-3xl font-bold text-green-vibrant">{rate}%</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted-foreground">رضا أولياء الأمور</p>
          <p className="mt-1 text-3xl font-bold text-accent">
            {fbAvg ? `${fbAvg}/5` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{fbCount} تقييم</p>
        </div>
        {(['present', 'absent', 'late', 'excused'] as const).map((k) => (
          <div key={k} className="card p-5">
            <p className="text-sm text-muted-foreground">{k}</p>
            <p className="mt-1 text-2xl font-bold">{counts[k]}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold">تغطية الأبعاد / Quotient coverage</h2>
        <div className="flex items-end gap-6">
          {Object.entries(qc).map(([q, v]) => {
            const max = Math.max(...Object.values(qc), 1);
            return (
              <div key={q} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-sm font-medium">{v}</span>
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: `${Math.max((v / max) * 140, 4)}px` }}
                />
                <span className="latin-term text-xs text-muted-foreground">{q}</span>
                <span className="text-[10px] text-muted-foreground">{QUOTIENT_NAME[q]?.ar}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
