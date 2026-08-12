'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';

export async function addAuthorizedAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user) return { error: 'unauthenticated' };
  const supabase = await createClient();
  const { error } = await supabase.from('authorized_pickup_persons').insert({
    student_id: String(formData.get('student_id')),
    parent_id: user.id,
    name: String(formData.get('name')),
    phone: String(formData.get('phone') ?? '') || null,
    relation: String(formData.get('relation') ?? '') || null,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/authorized');
  return { ok: true };
}

export async function toggleAuthorizedAction(formData: FormData) {
  const user = await getActiveUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase
    .from('authorized_pickup_persons')
    .update({ active: formData.get('active') === 'true' })
    .eq('id', String(formData.get('id')))
    .eq('parent_id', user.id);
  revalidatePath('/dashboard/authorized');
}
