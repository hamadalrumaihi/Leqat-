import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { dualDate, timeRange, QUOTIENT_COLOR, quotientLabel } from '@/lib/utils';
import { can } from '@/lib/roles';
import { GroupSwatch } from '@/components/group-swatch';
import { SessionCreate, PublishButton, StationForm } from '@/components/schedule-forms';

export default async function SchedulePage() {
  const t = await getTranslations('schedule');
  const locale = (await getLocale()) as 'ar' | 'en';
  const pref = locale === 'ar' ? 'arabic' : 'latin';
  const supabase = await createClient();
  const user = await getActiveUser();
  const canPlan = can(user?.role, 'planSchedule');

  let q = supabase
    .from('sessions')
    .select('id, week_no, date, start_time, end_time, published_at, group_id, groups(name_ar, color), stations(id, order_index, title_ar, duration_min, quotient, secondary_quotients, repeat_letter, is_prayer, value_ar, materials_ar)')
    .order('week_no', { ascending: true });
  if (!canPlan) q = q.not('published_at', 'is', null);
  const { data: sessions } = await q;

  let programs: { id: string; name_ar: string }[] = [];
  let groups: { id: string; name_ar: string; program_id: string }[] = [];
  let ramadan = false;
  if (canPlan) {
    const [{ data: progs }, { data: grps }] = await Promise.all([
      supabase.from('programs').select('id, name_ar, ramadan_mode'),
      supabase.from('groups').select('id, name_ar, program_id'),
    ]);
    programs = (progs ?? []).map((p) => ({ id: p.id as string, name_ar: p.name_ar as string }));
    ramadan = (progs ?? []).some((p) => p.ramadan_mode);
    groups = (grps ?? []).map((g) => ({
      id: g.id as string,
      name_ar: g.name_ar as string,
      program_id: g.program_id as string,
    }));
  }

  const published = (sessions ?? []).filter((s) => s.published_at);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {canPlan && <SessionCreate programs={programs} groups={groups} ramadan={ramadan} />}

      {!canPlan && published.length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">
          غير منشور بعد — لا توجد جلسات منشورة للأسبوع القادم.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {(sessions ?? []).map((s) => {
          const group = s.groups as unknown as { name_ar: string; color: string | null } | null;
          const stations = ((s.stations as Record<string, unknown>[]) ?? []).sort(
            (a, b) => (a.order_index as number) - (b.order_index as number),
          );
          return (
            <div key={s.id as string} className="card p-5">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold text-primary">
                  <GroupSwatch color={group?.color} />
                  {t('week')} {String(s.week_no ?? '')}
                </h2>
                {canPlan && !s.published_at ? (
                  <PublishButton sessionId={s.id as string} />
                ) : s.published_at ? (
                  <span className="rounded-full bg-green-vibrant/15 px-2 py-0.5 text-[11px] text-green-vibrant">
                    منشور
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-700">
                    غير منشور
                  </span>
                )}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                {group?.name_ar} · {dualDate(s.date as string, locale)}
                {s.start_time ? ` · ${timeRange(s.start_time as string, s.end_time as string, pref)}` : ''}
              </p>

              <ol className="space-y-2">
                {stations.map((st, i) => (
                  <li key={st.id as string} className="flex items-center gap-3 rounded-md border bg-background p-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {st.is_prayer ? '🕌 ' : ''}
                        {st.title_ar as string}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('duration')}: {String(st.duration_min)}د
                        {st.value_ar ? ` · ${String(st.value_ar)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {st.quotient ? (
                        <span
                          className="rounded px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: QUOTIENT_COLOR[st.quotient as string] }}
                        >
                          {quotientLabel(st.quotient as string)}
                        </span>
                      ) : null}
                      {((st.secondary_quotients as string[]) ?? []).map((sq) => (
                        <span key={sq} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {quotientLabel(sq)}
                        </span>
                      ))}
                      {st.repeat_letter ? (
                        <span className="latin-term rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">
                          {String(st.repeat_letter)}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>

              {canPlan && (
                <div className="mt-3">
                  <StationForm sessionId={s.id as string} nextIndex={stations.length + 1} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
