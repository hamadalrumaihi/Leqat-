import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { dualDate } from '@/lib/utils';

export default async function SchedulePage() {
  const t = await getTranslations('schedule');
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, week_no, date, status, stations(id, order_index, title_ar, duration_min, quotient, skill, value_ar, materials_ar)')
    .order('week_no', { ascending: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button className="btn-outline">{t('export')}</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(sessions ?? []).map((s) => {
          const stations = ((s.stations as Record<string, unknown>[]) ?? []).sort(
            (a, b) => (a.order_index as number) - (b.order_index as number),
          );
          return (
            <div key={s.id as string} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-primary">
                  {t('week')} {String(s.week_no)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {dualDate(s.date as string, locale)}
                </span>
              </div>
              <ol className="space-y-2">
                {stations.map((st, i) => (
                  <li
                    key={st.id as string}
                    className="flex items-center gap-3 rounded-md border bg-background p-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{st.title_ar as string}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('duration')}: {String(st.duration_min)}د · {String(st.value_ar)}
                      </p>
                    </div>
                    {st.quotient ? (
                      <span className="latin-term rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {String(st.quotient)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
              {(() => {
                const mats = stations
                  .map((st) => (st.materials_ar as string) ?? '')
                  .filter(Boolean);
                if (mats.length === 0) return null;
                return (
                  <div className="mt-3 rounded-md bg-muted/60 p-3">
                    <p className="mb-1 text-xs font-semibold">
                      قائمة المواد المجمّعة — Materials checklist
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {mats.map((m, i) => (
                        <li key={i}>☐ {m}</li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
