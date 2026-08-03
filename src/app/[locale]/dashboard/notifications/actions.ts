'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function markNotificationReadAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const id = String(formData.get('id') ?? '');
  const supabase = await createClient();
  // RLS ("update own notifications") scopes this to the caller.
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/notifications');
  return { ok: true };
}

export async function markAllReadAction() {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/notifications');
  return { ok: true };
}
