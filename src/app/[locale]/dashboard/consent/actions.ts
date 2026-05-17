'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';

export async function setConsentAction(_: unknown, formData: FormData) {
  const studentId = String(formData.get('student_id'));
  const grant = formData.get('grant') === 'true';
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };

  const supabase = await createClient();

  // Ownership check (defence in depth on top of RLS).
  const { data: student } = await supabase
    .from('students')
    .select('id, parent_id')
    .eq('id', studentId)
    .single();
  if (!student || (student as { parent_id: string }).parent_id !== user.id) {
    return { error: 'forbidden' };
  }

  // Append a new consent event. Withdrawal is retroactive because
  // every read derives state from the latest record.
  const { error } = await supabase.from('consents').insert({
    student_id: studentId,
    parent_id: user.id,
    photo_consent: grant,
    withdrawn_at: grant ? null : new Date().toISOString(),
  });
  if (error) return { error: error.message };

  await audit(grant ? 'consent.grant' : 'consent.withdraw', 'students', studentId);
  revalidatePath('/dashboard/consent');
  revalidatePath('/dashboard/gallery');
  return { ok: true, granted: grant };
}
