'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can } from '@/lib/roles';

export async function createScheduleEntryAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'planSchedule')) return { error: 'forbidden' };

  const programId = String(formData.get('program_id') ?? '');
  const groupId = String(formData.get('group_id') ?? '');
  const date = String(formData.get('date') ?? '');
  const start = String(formData.get('start_time') ?? '');
  const end = String(formData.get('end_time') ?? '');
  if (!programId || !groupId || !date || !start || !end) return { error: 'missing' };
  if (end <= start) return { error: 'bad_time' };

  const id = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v || null;
  };

  const supabase = await createClient();
  const { error } = await supabase.from('schedule_entries').insert({
    program_id: programId,
    group_id: groupId,
    activity_id: id('activity_id'),
    teacher_id: id('teacher_id'),
    room_id: id('room_id'),
    date,
    start_time: start,
    end_time: end,
    notes_ar: id('notes_ar'),
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/master-schedule');
  return { ok: true };
}

export async function deleteScheduleEntryAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'planSchedule')) return { error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('schedule_entries')
    .delete()
    .eq('id', String(formData.get('id') ?? ''));
  if (error) return { error: error.message };
  revalidatePath('/dashboard/master-schedule');
  return { ok: true };
}

// Publish every entry for a program+date. Conflicts are surfaced in the
// UI as a warning but never block — the soft-gate philosophy — so
// publishing an imperfect day is the planner's informed choice.
export async function publishDayAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'planSchedule')) return { error: 'forbidden' };
  const programId = String(formData.get('program_id') ?? '');
  const date = String(formData.get('date') ?? '');
  if (!programId || !date) return { error: 'missing' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('schedule_entries')
    .update({ published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('program_id', programId)
    .eq('date', date)
    .is('published_at', null);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/master-schedule');
  return { ok: true };
}

// ── Schedule builder: drag-reorder a day, reflow times sequentially ──
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const fromMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;

// Persist a new order for a program+date: each entry keeps its own
// duration; start/end are repacked back-to-back from the earliest
// current start. Traditional per-entry editing stays available.
export async function reorderScheduleDayAction(
  programId: string,
  date: string,
  orderedIds: string[],
) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'planSchedule')) return { error: 'forbidden' };
  if (!programId || !date || !Array.isArray(orderedIds) || orderedIds.length < 2) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('schedule_entries')
    .select('id, start_time, end_time')
    .eq('program_id', programId)
    .eq('date', date);
  const rows = (data ?? []) as { id: string; start_time: string; end_time: string }[];
  if (rows.length < 2) return { ok: true };

  const dur = new Map(rows.map((r) => [r.id, toMin(r.end_time) - toMin(r.start_time)]));
  const base = Math.min(...rows.map((r) => toMin(r.start_time)));
  const ordered = orderedIds.filter((id) => dur.has(id));

  let cursor = base;
  for (const id of ordered) {
    const d = dur.get(id) ?? 30;
    const start = cursor;
    const end = cursor + d;
    // RLS ("management writes schedule") re-checks on the server.
    const { error } = await supabase
      .from('schedule_entries')
      .update({ start_time: fromMin(start), end_time: fromMin(end), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
    cursor = end;
  }
  revalidatePath('/dashboard/master-schedule');
  return { ok: true };
}
