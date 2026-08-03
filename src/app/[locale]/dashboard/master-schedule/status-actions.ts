'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isStaff } from '@/lib/roles';

const STATUSES = [
  'scheduled',
  'ready',
  'in_progress',
  'completed',
  'delayed',
  'cancelled',
  'moved',
] as const;

export async function updateActivityStatusAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return { error: 'forbidden' };

  const entry = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!entry || !STATUSES.includes(status as (typeof STATUSES)[number])) return { error: 'invalid' };

  const supabase = await createClient();
  // The RPC (SECURITY DEFINER) is the real authorization boundary:
  // management, the group's staff, or the assigned specialist teacher.
  const { error } = await supabase.rpc('update_activity_status', {
    entry,
    new_status: status,
    note: String(formData.get('note') ?? '').trim() || null,
    support: formData.get('support') === 'on',
  });
  if (error) return { error: error.message === 'not_authorized' ? 'forbidden' : error.message };
  revalidatePath('/dashboard/master-schedule');
  return { ok: true };
}
