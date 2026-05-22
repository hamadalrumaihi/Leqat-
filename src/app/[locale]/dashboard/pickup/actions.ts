'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';

const STAFF = ['executive', 'program_planner', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'];

export async function arriveAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const supabase = await createClient();
  const { error } = await supabase.from('pickup_status').insert({
    session_id: String(formData.get('session_id')),
    student_id: String(formData.get('student_id')),
    parent_id: user.id,
    mode: String(formData.get('mode') ?? 'self'),
    person_name: String(formData.get('person_name') ?? '') || null,
    person_phone: String(formData.get('person_phone') ?? '') || null,
    picked_up_by_name: String(formData.get('person_name') ?? '') || null,
    picked_up_by_phone: String(formData.get('person_phone') ?? '') || null,
    arrived_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function releaseAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(user.role)) return { error: 'forbidden' };
  const supabase = await createClient();
  const id = String(formData.get('pickup_id'));
  const { error } = await supabase
    .from('pickup_status')
    .update({ released_at: new Date().toISOString(), released_by: user.id })
    .eq('id', id);
  if (error) return { error: error.message };
  await audit('pickup.release', 'pickup_status', id);
  return { ok: true };
}
