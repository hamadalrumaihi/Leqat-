'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { effectiveRole } from '@/lib/utils';

const CAN = ['executive', 'program_planner'];
function canManage(role: string) {
  return CAN.includes(effectiveRole(role));
}

export async function createProgramAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canManage(user.role)) return { error: 'forbidden' };
  const supabase = await createClient();

  // value_ar/value_en left blank are auto-filled by the 0006 trigger.
  const { error } = await supabase.from('programs').insert({
    name_ar: String(formData.get('name_ar')),
    name_en: String(formData.get('name_en') ?? '') || null,
    type: String(formData.get('type') ?? 'weekly'),
    age_grp: String(formData.get('age_grp') ?? 'fityan'),
    gender: String(formData.get('gender') ?? 'both'),
    quotient: String(formData.get('quotient') ?? '') || null,
    value_ar: String(formData.get('value_ar') ?? '') || null,
    value_en: String(formData.get('value_en') ?? '') || null,
    weeks: Number(formData.get('weeks') ?? 10),
    capacity: Number(formData.get('capacity') ?? 15),
    price_qar: Number(formData.get('price_qar') ?? 0),
    ramadan_mode: formData.get('ramadan_mode') === 'on',
    status: 'draft',
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/programs');
  return { ok: true };
}

export async function updateProgramAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canManage(user.role)) return { error: 'forbidden' };
  const supabase = await createClient();

  const { error } = await supabase
    .from('programs')
    .update({
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
