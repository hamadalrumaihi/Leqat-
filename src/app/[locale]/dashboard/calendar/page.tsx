import { getTranslations, getLocale } from 'next-intl/server';
import { redirect, Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { isStaff } from '@/lib/roles';
import { qatarToday } from '@/lib/utils';
import { ScheduleCalendar, type CalEvent } from '@/components/schedule-calendar';

function addDays(date: string, delta: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default async function CalendarPage() {
  const user = await getActiveUser();
  const locale = await getLocale();
  if (!user || !isStaff(user.role)) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('calendar');
  const supabase = await createClient();
  const today = qatarToday();

  // A window around today; RLS scopes rows to the caller (management
  // all, group staff their group, teacher their assignments).
  const { data } = await supabase
    .from('schedule_entries')
    .select('id, date, start_time, end_time, groups(name_ar, color), activities(title_ar), teacher:profiles!schedule_entries_teacher_id_fkey(full_name_ar), room:rooms(name_ar)')
    .gte('date', addDays(today, -30))
    .lte('date', addDays(today, 60))
    .order('date', { ascending: true });

  const events: CalEvent[] = (data ?? []).map((e) => {
    const g = e.groups as unknown as { name_ar: string; color: string | null } | null;
    const a = e.activities as unknown as { title_ar: string } | null;
    const teacher = (e.teacher as unknown as { full_name_ar: string } | null)?.full_name_ar ?? null;
    const room = (e.room as unknown as { name_ar: string } | null)?.name_ar ?? null;
    const d = e.date as string;
    return {
      id: e.id as string,
      title: `${a?.title_ar ?? '—'}${g?.name_ar ? ` · ${g.name_ar}` : ''}`,
      start: new Date(`${d}T${e.start_time as string}`),
      end: new Date(`${d}T${e.end_time as string}`),
      color: g?.color ?? null,
      teacher,
      room,
    };
  });

  const labels = {
    today: t('today'), previous: t('previous'), next: t('next'),
    week: t('week'), day: t('day'), agenda: t('agenda'),
    date: t('date'), time: t('time'), event: t('event'), noEvents: t('noEvents'),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link href="/dashboard/master-schedule" className="btn-outline h-9 px-4 text-sm">{t('editList')}</Link>
      </div>
      <ScheduleCalendar events={events} labels={labels} defaultDate={today} />
    </div>
  );
}
