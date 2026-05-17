import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { QuotientRadar } from '@/components/quotient-radar';
import { dualDate } from '@/lib/utils';

export default async function ProgressPage() {
  const t = await getTranslations('dashboard');
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();

  // Recognition tokens visible under RLS (own child / own / staff group).
  const { data: tokens } = await supabase
    .from('recognition_tokens')
    .select('id, value_ar, note_ar, created_at, students(full_name_ar)')
    .order('created_at', { ascending: false })
    .limit(50);

  // Quotient exposure from reports the user can see.
  const { data: reports } = await supabase.from('reports').select('quotient_tags');
  const radar = { SQ: 0, EQ: 0, IQ: 0, PQ: 0 } as Record<string, number>;
  for (const r of reports ?? [])
    for (const q of (r.quotient_tags as string[]) ?? []) radar[q] = (radar[q] ?? 0) + 1;
  if (Object.values(radar).every((v) => v === 0)) Object.assign(radar, { SQ: 1, EQ: 1, IQ: 1, PQ: 1 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('myChild')}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-2 font-semibold">تغطية الأبعاد — Quotient exposure</h2>
          <QuotientRadar values={radar as Record<'SQ' | 'EQ' | 'IQ' | 'PQ', number>} />
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-semibold">جدار التحفيز المعنوي — Recognition wall</h2>
          {(tokens ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تحفيزات بعد.</p>
          ) : (
            <ul className="space-y-3">
              {(tokens ?? []).map((tok) => (
                <li key={tok.id as string} className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-green-vibrant/15 px-3 py-1 text-sm font-semibold text-green-vibrant">
                      {tok.value_ar as string}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dualDate(tok.created_at as string, locale)}
                    </span>
                  </div>
                  {tok.note_ar ? <p className="mt-2 text-sm">{tok.note_ar as string}</p> : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground">
            خاص بالطفل ووليّه فقط — لا توجد لوحات صدارة عامة.
          </p>
        </section>
      </div>
    </div>
  );
}
