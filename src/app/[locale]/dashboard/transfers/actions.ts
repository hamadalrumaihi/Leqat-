'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isManagement } from '@/lib/roles';

const ERR: Record<string, string> = {
  not_authorized: 'forbidden',
  enrollment_not_found: 'not_found',
  group_not_found: 'not_found',
  program_mismatch: 'program_mismatch',
  already_in_group: 'already_in_group',
};

export async function transferStudentAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !isManagement(user.role)) return { error: 'forbidden' };

  const enrollment = String(formData.get('enrollment_id') ?? '');
  const toGroup = String(formData.get('to_group_id') ?? '');
  if (!enrollment || !toGroup) return { error: 'missing' };

  const supabase = await createClient();
  // The RPC (SECURITY DEFINER) enforces management + same-program.
  const { error } = await supabase.rpc('transfer_student', {
    p_enrollment: enrollment,
    p_to_group: toGroup,
    p_reason: String(formData.get('reason') ?? '').trim() || null,
    p_notes: String(formData.get('notes') ?? '').trim() || null,
  });
  if (error) {
    const key = Object.keys(ERR).find((k) => error.message.includes(k));
    return { error: key ? ERR[key] : error.message };
  }
  revalidatePath('/dashboard/transfers');
  return { ok: true };
}
