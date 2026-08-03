import { getTranslations, getLocale } from 'next-intl/server';
import { redirect, Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isManagement } from '@/lib/roles';
import { qatarToday, formatTime12 } from '@/lib/utils';
import { detectConflicts, type ScheduleEntry } from '@/lib/schedule';
import { EXEC_STATUS_STYLE } from '@/lib/exec-status';

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone ?? 'text-primary'}`}>{value}</p>
    </div>
  );
}

export default async function OpsBoardPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user || !isManagement(user.role)) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('opsBoard');
  const te = await getTranslations('exec');
  const ti = await getTranslations('issues');
  const pref = locale === 'ar' ? 'arabic' : 'latin';
  const supabase = await createClient();
  const today = qatarToday();

  const { data: program } = await supabase
    .from('programs')
    .select('id, name_ar, status, daily_start, daily_end')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!program) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="card p-8 text-center text-muted-foreground">{t('noProgram')}</div>
      </div>
    );
  }
  const programId = program.id as string;

  // Parallel aggregation — all read under the management caller's RLS.
  const [schedRes, issuesRes, annRes, enrollRes, attRes, groupsRes, roomsRes] = await Promise.all([
    supabase
      .from('schedule_entries')
      .select('id, start_time, end_time, group_id, teacher_id, room_id, exec_status, groups(name_ar), activities(title_ar), teacher:profiles!schedule_entries_teacher_id_fkey(full_name_ar), room:rooms(name_ar)')
      .eq('program_id', programId)
      .eq('date', today)
      .order('start_time', { ascending: true }),
    supabase
      .from('issues')
      .select('id, kind, priority, status, description_ar')
      .neq('status', 'resolved')
      .order('created_at', { ascending: false }),
    supabase
      .from('announcements')
      .select('id, title_ar, audience, created_at')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('enrollments').select('id', { count: 'exact', head: true }).not('group_id', 'is', null).eq('status', 'active'),
    supabase.from('attendance').select('status, sessions!inner(date)').eq('sessions.date', today),
    supabase.from('groups').select('id', { count: 'exact', head: true }).eq('program_id', programId),
    supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('program_id', programId),
  ]);

  type Sched = {
    id: string; start_time: string; end_time: string; group_id: string;
    teacher_id: string | null; room_id: string | null; exec_status: string;
    groups: { name_ar: string } | null; activities: { title_ar: string } | null;
    teacher: { full_name_ar: string } | null; room: { name_ar: string } | null;
  };
  const sched = (schedRes.data ?? []) as unknown as Sched[];
  const issues = (issuesRes.data ?? []) as unknown as { id: string; kind: string; priority: string; status: string; description_ar: string }[];
  const anns = (annRes.data ?? []) as unknown as { id: string; title_ar: string; audience: string }[];

  const conflicts = detectConflicts(
    sched.map<ScheduleEntry>((e) => ({
      id: e.id, date: today, start_time: e.start_time, end_time: e.end_time,
      group_id: e.group_id, teacher_id: e.teacher_id, room_id: e.room_id,
    })),
    { daily_start: program.daily_start as string | null, daily_end: program.daily_end as string | null },
  );

  const byStatus = (s: string) => sched.filter((e) => e.exec_status === s).length;
  const delayed = sched.filter((e) => e.exec_status === 'delayed' || e.exec_status === 'moved').length;
  const noTeacher = sched.filter((e) => !e.teacher_id).length;
  const occupiedRooms = new Set(sched.map((e) => e.room_id).filter(Boolean)).size;

  const expected = enrollRes.count ?? 0;
  const marks = (attRes.data ?? []) as unknown as { status: string }[];
  const present = marks.filter((m) => m.status === 'present').length;
  const marked = marks.length;
  const notMarked = Math.max(0, expected - marked);

  const PRIO = { urgent: 'text-destructive', high: 'text-amber-700', normal: '', low: 'text-muted-foreground' } as Record<string, string>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <span className="text-sm text-muted-foreground">
          {program.name_ar as string} · <span dir="ltr">{today}</span>
        </span>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t('expected')} value={expected} />
        <Stat label={t('present')} value={present} tone="text-green-vibrant" />
        <Stat label={t('notMarked')} value={notMarked} tone={notMarked ? 'text-amber-700' : 'text-primary'} />
        <Stat label={t('activitiesToday')} value={sched.length} />
        <Stat label={t('openIssues')} value={issues.length} tone={issues.length ? 'text-amber-700' : 'text-primary'} />
        <Stat label={t('conflicts')} value={conflicts.length} tone={conflicts.length ? 'text-destructive' : 'text-primary'} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('inProgress')} value={byStatus('in_progress')} />
        <Stat label={t('completed')} value={byStatus('completed')} tone="text-green-vibrant" />
        <Stat label={t('delayed')} value={delayed} tone={delayed ? 'text-amber-700' : 'text-primary'} />
        <Stat label={t('roomsOccupied')} value={`${occupiedRooms}/${roomsRes.count ?? 0}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Today's activities */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t('todaysActivities')}</h2>
            <Link href="/dashboard/master-schedule" className="text-xs text-primary hover:underline">{t('open')}</Link>
          </div>
          {sched.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noneToday')}</p>
          ) : (
            <ul className="space-y-2">
              {sched.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span dir="ltr" className="tabular-nums text-muted-foreground">
                    {formatTime12(e.start_time, pref)}
                  </span>
                  <span className="font-medium">{e.activities?.title_ar ?? '—'}</span>
                  <span className="text-muted-foreground">{e.groups?.name_ar}</span>
                  {!e.teacher_id && <span className="text-xs text-amber-700">{t('noTeacher')}</span>}
                  <span className={`ms-auto rounded-full px-2 py-0.5 text-xs font-medium ${EXEC_STATUS_STYLE[e.exec_status] ?? 'bg-muted'}`}>
                    {te(`status.${e.exec_status}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {(conflicts.length > 0 || noTeacher > 0) && (
            <p className="mt-3 text-xs text-amber-700">
              {conflicts.length > 0 && t('conflictsNote', { count: conflicts.length })}
              {conflicts.length > 0 && noTeacher > 0 ? ' · ' : ''}
              {noTeacher > 0 && t('noTeacherNote', { count: noTeacher })}
            </p>
          )}
        </section>

        {/* Open issues */}
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t('openIssues')}</h2>
            <Link href="/dashboard/issues" className="text-xs text-primary hover:underline">{t('open')}</Link>
          </div>
          {issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noIssues')}</p>
          ) : (
            <ul className="space-y-2">
              {issues.slice(0, 6).map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-sm">
                  <span className={`shrink-0 text-xs font-medium ${PRIO[i.priority] ?? ''}`}>{ti(`prio.${i.priority}`)}</span>
                  <span className="font-medium">{ti(`kinds.${i.kind}`)}</span>
                  <span className="truncate text-muted-foreground">{i.description_ar}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Latest announcements */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t('latestAnnouncements')}</h2>
          <Link href="/dashboard/announcements" className="text-xs text-primary hover:underline">{t('open')}</Link>
        </div>
        {anns.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noAnnouncements')}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {anns.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <span aria-hidden>📣</span>
                <span className="font-medium">{a.title_ar}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
