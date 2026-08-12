'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can } from '@/lib/roles';

type ActivityStatus =
  | 'proposed'
  | 'under_review'
  | 'approved'
  | 'needs_revision'
  | 'rejected'
  | 'archived';

// Only these transitions are offered in the UI; RLS ("management writes
// activities") is the real guard.
const ALLOWED: ActivityStatus[] = [
  'proposed',
  'under_review',
  'approved',
  'needs_revision',
  'rejected',
  'archived',
];

export async function proposeActivityAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'manageActivities')) return { error: 'forbidden' };

  const titleAr = String(formData.get('title_ar') ?? '').trim();
  if (!titleAr) return { error: 'missing' };

  const num = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v ? Number(v) : null;
  };
  const text = (k: string) => String(formData.get(k) ?? '').trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from('activities').insert({
    title_ar: titleAr,
    category: text('category'),
    objective_ar: text('objective_ar'),
    description_ar: text('description_ar'),
    instructions_ar: text('instructions_ar'),
    duration_min: num('duration_min') ?? 45,
    age_grp: text('age_grp'),
    materials_ar: text('materials_ar'),
    prep_ar: text('prep_ar'),
    max_group_size: num('max_group_size'),
    safety_ar: text('safety_ar'),
    status: 'proposed',
    proposed_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/activities');
  return { ok: true };
}

export async function setActivityStatusAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'manageActivities')) return { error: 'forbidden' };

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as ActivityStatus;
  if (!id || !ALLOWED.includes(status)) return { error: 'invalid' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('activities')
    .update({ status, reviewed_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/activities');
  return { ok: true };
}
