'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can } from '@/lib/roles';
import { VISIBLE_AGE_GROUPS, type AgeGroup } from '@/lib/age-groups';

// A program targets one or both of the two age categories; anything
// else submitted is dropped, and an empty pick falls back to both.
function readAgeGroups(formData: FormData): AgeGroup[] {
  const picked = formData
    .getAll('age_grps')
    .map(String)
    .filter((g): g is AgeGroup => (VISIBLE_AGE_GROUPS as string[]).includes(g));
  return picked.length > 0 ? picked : [...VISIBLE_AGE_GROUPS];
}

export async function createProgramAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'managePrograms')) return { error: 'forbidden' };
  const supabase = await createClient();

  const ageGroups = readAgeGroups(formData);

  // value_ar/value_en left blank are auto-filled by the 0006 trigger.
  const { error } = await supabase.from('programs').insert({
    name_ar: String(formData.get('name_ar')),
    name_en: String(formData.get('name_en') ?? '') || null,
    type: String(formData.get('type') ?? 'weekly'),
    age_grps: ageGroups,
    age_grp: ageGroups[0], // legacy single-value column
    gender: String(formData.get('gender') ?? 'both'),
    quotient: String(formData.get('quotient') ?? '') || null,
    value_ar: String(formData.get('value_ar') ?? '') || null,
    value_en: String(formData.get('value_en') ?? '') || null,
    weeks: Number(formData.get('weeks') ?? 10),
    capacity: Number(formData.get('capacity') ?? 15),
    ramadan_mode: formData.get('ramadan_mode') === 'on',
    status: 'draft',
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/programs');
  return { ok: true };
}

export async function updateProgramAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'managePrograms')) return { error: 'forbidden' };
  const supabase = await createClient();

  const name = String(formData.get('name_ar') ?? '').trim();
  if (!name) return { error: 'name_required' };
  const ageGroups = readAgeGroups(formData);

  const { error } = await supabase
    .from('programs')
    .update({
      name_ar: name,
      age_grps: ageGroups,
      age_grp: ageGroups[0], // legacy single-value column
      quotient: String(formData.get('quotient') ?? '') || null,
      value_ar: String(formData.get('value_ar') ?? '') || null,
      value_en: String(formData.get('value_en') ?? '') || null,
      ramadan_mode: formData.get('ramadan_mode') === 'on',
      status: String(formData.get('status') ?? 'draft'),
    })
    .eq('id', String(formData.get('program_id')));
  if (error) return { error: error.message };
  revalidatePath('/dashboard/programs');
  return { ok: true };
}
