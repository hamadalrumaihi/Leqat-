'use server';

import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/auth';
import { getActiveUser } from '@/lib/program-context';
import { can } from '@/lib/roles';

export async function arriveAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
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
  // 23505 = the pickup_one_open_arrival guard (0011): the parent is
  // already announced for this child — a double-tap, treat as success.
  if (error && error.code !== '23505') return { error: error.message };
  return { ok: true };
}

export async function releaseAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'staffPickup')) return { error: 'forbidden' };
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
