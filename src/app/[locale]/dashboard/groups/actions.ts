'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can } from '@/lib/roles';

// Age division is optional; only the two enum values are accepted.
function divisionOrNull(v: FormDataEntryValue | null): 'younger' | 'teen' | null {
  return v === 'younger' || v === 'teen' ? v : null;
}

export async function createGroupAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'manageGroups')) return { error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase.from('groups').insert({
    program_id: String(formData.get('program_id')),
    name_ar: String(formData.get('name_ar')),
    name_en: String(formData.get('name_en') ?? '') || null,
    color: String(formData.get('color') ?? '') || null,
    capacity: Number(formData.get('capacity') ?? 15),
    division: divisionOrNull(formData.get('division')),
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/groups');
  return { ok: true };
}

export async function updateGroupAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'manageGroups')) return { error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('groups')
    .update({
      name_ar: String(formData.get('name_ar')),
      color: String(formData.get('color') ?? '') || null,
      capacity: Number(formData.get('capacity') ?? 15),
      division: divisionOrNull(formData.get('division')),
    })
    .eq('id', String(formData.get('group_id')));
  if (error) return { error: error.message };
  revalidatePath('/dashboard/groups');
  return { ok: true };
}
