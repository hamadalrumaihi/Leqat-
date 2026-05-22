'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { effectiveRole } from '@/lib/utils';

const CAN_MANAGE = ['executive', 'program_planner'];

export async function createGroupAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !CAN_MANAGE.includes(effectiveRole(user.role))) return { error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase.from('groups').insert({
    program_id: String(formData.get('program_id')),
    name_ar: String(formData.get('name_ar')),
    name_en: String(formData.get('name_en') ?? '') || null,
    color: String(formData.get('color') ?? '') || null,
    capacity: Number(formData.get('capacity') ?? 15),
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/groups');
  return { ok: true };
}

export async function updateGroupAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !CAN_MANAGE.includes(effectiveRole(user.role))) return { error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('groups')
    .update({
      name_ar: String(formData.get('name_ar')),
      color: String(formData.get('color') ?? '') || null,
      capacity: Number(formData.get('capacity') ?? 15),
    })
    .eq('id', String(formData.get('group_id')));
  if (error) return { error: error.message };
  revalidatePath('/dashboard/groups');
  return { ok: true };
}
