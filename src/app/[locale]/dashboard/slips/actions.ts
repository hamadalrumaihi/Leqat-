'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';
import { can } from '@/lib/roles';

export async function createSlipAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'manageSlips')) return { error: 'forbidden' };
  const supabase = await createClient();

  const { error } = await supabase.from('permission_slips').insert({
    program_id: String(formData.get('program_id')),
    title_ar: String(formData.get('title_ar')),
    body_ar: String(formData.get('body_ar')),
    due_date: String(formData.get('due_date') ?? '') || null,
    created_by: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/slips');
  return { ok: true };
}

export async function signSlipAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const supabase = await createClient();

  const slipId = String(formData.get('slip_id'));
  const studentId = String(formData.get('student_id'));
  const signedName = String(formData.get('signed_name') ?? '').trim();
  if (!signedName) return { error: 'name_required' };

  // Defence in depth: confirm the child belongs to this parent.
  const { data: student } = await supabase
    .from('students')
    .select('parent_id')
    .eq('id', studentId)
    .single();
  if (!student || (student as { parent_id: string }).parent_id !== user.id) {
    return { error: 'forbidden' };
  }

  const { error } = await supabase.from('permission_slip_signatures').insert({
    slip_id: slipId,
    student_id: studentId,
    parent_id: user.id,
    signed_name: signedName,
  });
  if (error) return { error: error.message };

  await audit('slip.sign', 'permission_slips', slipId, { studentId });
  revalidatePath('/dashboard/slips');
  return { ok: true };
}
