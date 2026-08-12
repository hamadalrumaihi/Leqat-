'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/auth';
import { getActiveUser } from '@/lib/program-context';
import { can } from '@/lib/roles';

export async function awardRecognitionAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'awardRecognition')) return { error: 'forbidden' };

  const studentId = String(formData.get('student_id'));
  const valueAr = String(formData.get('value_ar') ?? '').trim();
  if (!studentId || !valueAr) return { error: 'missing' };

  const supabase = await createClient();
  const { error } = await supabase.from('recognition_tokens').insert({
    student_id: studentId,
    awarded_by: user.id,
    value_ar: valueAr,
    note_ar: String(formData.get('note_ar') ?? '') || null,
  });
  if (error) return { error: error.message };

  await audit('recognition.award', 'students', studentId, { valueAr });
  revalidatePath('/dashboard/recognition');
  revalidatePath('/dashboard/progress');
  return { ok: true };
}
