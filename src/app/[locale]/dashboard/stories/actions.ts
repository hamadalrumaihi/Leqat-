'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function createStoryAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role === 'parent' || user.role === 'student') {
    return { error: 'forbidden' };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('stories').insert({
    title_ar: String(formData.get('title_ar')),
    body_ar: String(formData.get('body_ar') ?? '') || null,
    value_ar: String(formData.get('value_ar') ?? '') || null,
    age_grp: String(formData.get('age_grp') ?? '') || null,
    quotient: String(formData.get('quotient') ?? '') || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/stories');
  return { ok: true };
}
