'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/roles';

export async function createScheduleEntryAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
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
  const user = await getCurrentUser();
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
