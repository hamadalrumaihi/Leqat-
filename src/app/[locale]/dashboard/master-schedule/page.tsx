import { getTranslations, getLocale } from 'next-intl/server';
import { redirect, Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { can, isStaff } from '@/lib/roles';
import { qatarToday, formatTime12 } from '@/lib/utils';
import {
  detectConflicts,
  conflictedEntryIds,
  type ScheduleEntry,
  type Conflict,
} from '@/lib/schedule';
import { ScheduleEntryForm } from '@/components/schedule-entry-form';
import { DeleteEntryButton, PublishDayButton } from '@/components/schedule-actions';
import { ActivityStatusControls } from '@/components/activity-status-controls';
import { EXEC_STATUS_STYLE } from '@/lib/exec-status';

function addDays(date: string, delta: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default async function MasterSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; d?: string }>;
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user || !isStaff(user.role)) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('scheduleOps');
  const te = await getTranslations('exec');
  const canManage = can(user!.role, 'planSchedule');
  const supabase = await createClient();
  const { p, d } = await searchParams;

  const { data: programs } = await supabase
    .from('programs')
    .select('id, name_ar, daily_start, daily_end')
    .order('created_at', { ascending: true });
  const programList = programs ?? [];
  const program = programList.find((x) => x.id === p) ?? programList[0];
  const date = d ?? qatarToday();

  if (!program) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="card p-8 text-center text-muted-foreground">{t('noProgram')}</div>
      </div>
    );
  }

  const programId = program.id as string;

  const { data: rows } = await supabase
    .from('schedule_entries')
    .select(
      'id, date, start_time, end_time, group_id, teacher_id, room_id, exec_status, published_at,' +
        ' exec_note, support_requested,' +
        ' groups(name_ar), activities(title_ar), room:rooms(name_ar),' +
        ' teacher:profiles!schedule_entries_teacher_id_fkey(full_name_ar)',
    )
    .eq('program_id', programId)
    .eq('date', date)
    .order('start_time', { ascending: true });

  type Row = {
    id: string; date: string; start_time: string; end_time: string;
    group_id: string; teacher_id: string | null; room_id: string | null;
    exec_status: string; published_at: string | null;
    exec_note: string | null; support_requested: boolean;
    groups: { name_ar: string } | null;
    activities: { title_ar: string } | null;
    room: { name_ar: string } | null;
    teacher: { full_name_ar: string } | null;
  };
  const entries = (rows ?? []) as unknown as Row[];

  const forConflict: ScheduleEntry[] = entries.map((e) => ({
    id: e.id, date: e.date, start_time: e.start_time, end_time: e.end_time,
    group_id: e.group_id, teacher_id: e.teacher_id, room_id: e.room_id,
    groupName: e.groups?.name_ar, teacherName: e.teacher?.full_name_ar,
    roomName: e.room?.name_ar, activityName: e.activities?.title_ar,
  }));
  const conflicts: Conflict[] = canManage
    ? detectConflicts(forConflict, { daily_start: program.daily_start as string | null, daily_end: program.daily_end as string | null })
    : [];
  const flagged = conflictedEntryIds(conflicts);

  // Reference data for the create form (management only).
  let groups: { id: string; label: string }[] = [];
  let activities: { id: string; label: string }[] = [];
  let teachers: { id: string; label: string }[] = [];
  let rooms: { id: string; label: string }[] = [];
  if (canManage) {
    const [g, a, tch, r] = await Promise.all([
      supabase.from('groups').select('id, name_ar').eq('program_id', programId),
      supabase.from('activities').select('id, title_ar').eq('status', 'approved'),
      supabase.from('profiles').select('id, full_name_ar').eq('role', 'specialist_teacher'),
      supabase.from('rooms').select('id, name_ar').eq('program_id', programId),
    ]);
    groups = (g.data ?? []).map((x) => ({ id: x.id as string, label: x.name_ar as string }));
    activities = (a.data ?? []).map((x) => ({ id: x.id as string, label: x.title_ar as string }));
    teachers = (tch.data ?? []).map((x) => ({ id: x.id as string, label: x.full_name_ar as string }));
    rooms = (r.data ?? []).map((x) => ({ id: x.id as string, label: x.name_ar as string }));
  }

  const qs = (dd: string) => `/dashboard/master-schedule?p=${programId}&d=${dd}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {canManage && (
          <ScheduleEntryForm
            programId={programId}
            date={date}
            groups={groups}
            activities={activities}
            teachers={teachers}
            rooms={rooms}
          />
        )}
      </div>

      {/* Program selector + date nav */}
      <div className="flex flex-wrap items-center gap-2">
        {programList.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {programList.map((pr) => (
              <Link
                key={pr.id as string}
                href={`/dashboard/master-schedule?p=${pr.id as string}&d=${date}`}
                className={`rounded-md px-3 py-1.5 text-sm ${pr.id === programId ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                {pr.name_ar as string}
              </Link>
            ))}
          </div>
        )}
        <div className="ms-auto flex items-center gap-2">
          <Link href={qs(addDays(date, -1))} className="btn-outline h-9 px-3">‹</Link>
          <span dir="ltr" className="min-w-28 text-center text-sm font-medium">{date}</span>
          <Link href={qs(addDays(date, 1))} className="btn-outline h-9 px-3">›</Link>
        </div>
      </div>

      {/* Conflicts panel (management) */}
      {canManage && conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="mb-2 font-semibold text-amber-700">
            {t('conflictsFound', { count: conflicts.length })}
          </p>
          <ul className="space-y-1 text-sm text-amber-700">
            {conflicts.map((c, i) => (
              <li key={i}>• {t(`conflict.${c.kind}`)}{c.label ? ` — ${c.label}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">{t('empty')}</div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className={`card flex flex-wrap items-center gap-3 p-4 ${flagged.has(e.id) ? 'border-amber-500/50' : ''}`}
            >
              <span dir="ltr" className="text-sm font-semibold tabular-nums">
                {formatTime12(e.start_time, locale === 'ar' ? 'arabic' : 'latin')} – {formatTime12(e.end_time, locale === 'ar' ? 'arabic' : 'latin')}
              </span>
              <span className="font-medium">{e.activities?.title_ar ?? '—'}</span>
              <span className="text-sm text-muted-foreground">{e.groups?.name_ar}</span>
              <span className="text-sm text-muted-foreground">
                {e.teacher?.full_name_ar ?? <span className="text-amber-700">{t('conflict.no_teacher')}</span>}
              </span>
              {e.room?.name_ar ? <span className="text-sm text-muted-foreground">🏫 {e.room.name_ar}</span> : null}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXEC_STATUS_STYLE[e.exec_status] ?? 'bg-muted'}`}>
                {te(`status.${e.exec_status}`)}
              </span>
              {e.support_requested ? (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{te('supportFlag')}</span>
              ) : null}
              {e.published_at ? (
                <span className="rounded-full bg-green-vibrant/15 px-2 py-0.5 text-xs text-green-vibrant">{t('publishedTag')}</span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t('draftTag')}</span>
              )}
              <span className="ms-auto flex items-center gap-2">
                <ActivityStatusControls
                  id={e.id}
                  status={e.exec_status}
                  note={e.exec_note}
                  support={e.support_requested}
                />
                {canManage && <DeleteEntryButton id={e.id} />}
              </span>
              {e.exec_note ? (
                <p className="w-full text-xs text-muted-foreground">📝 {e.exec_note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage && entries.length > 0 && (
        <div className="flex justify-end">
          <PublishDayButton programId={programId} date={date} />
        </div>
      )}
    </div>
  );
}
