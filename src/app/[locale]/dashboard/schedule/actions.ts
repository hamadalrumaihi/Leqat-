'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';
import { effectiveRole } from '@/lib/utils';

const PLANNER = ['executive', 'program_planner'];
function canPlan(role: string) {
  return PLANNER.includes(effectiveRole(role));
}

export async function createSessionAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canPlan(user.role)) return { error: 'forbidden' };
  const supabase = await createClient();

  const { error } = await supabase.from('sessions').insert({
    program_id: String(formData.get('program_id')),
    group_id: String(formData.get('group_id')) || null,
    week_no: formData.get('week_no') ? Number(formData.get('week_no')) : null,
    date: String(formData.get('date')),
    start_time: String(formData.get('start_time') ?? '') || null,
    end_time: String(formData.get('end_time') ?? '') || null,
    status: 'planned',
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/schedule');
  return { ok: true };
}

export async function publishSessionAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canPlan(user.role)) return { error: 'forbidden' };
  const supabase = await createClient();
  const sessionId = String(formData.get('session_id'));
  const { error } = await supabase
    .from('sessions')
    .update({ published_at: new Date().toISOString(), published_by: user.id, status: 'open' })
    .eq('id', sessionId);
  if (error) return { error: error.message };
  await audit('session.publish', 'sessions', sessionId);
  revalidatePath('/dashboard/schedule');
  return { ok: true };
}

export async function createStationAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canPlan(user.role)) return { error: 'forbidden' };
  const supabase = await createClient();

  const isPrayer = formData.get('is_prayer') === 'on';
  const primary = String(formData.get('quotient') ?? '') || null;
  const secondary = formData
    .getAll('secondary_quotients')
    .map(String)
    .filter((q) => q !== primary); // primary cannot also be secondary

  const { error } = await supabase.from('stations').insert({
    session_id: String(formData.get('session_id')),
    order_index: Number(formData.get('order_index') ?? 0),
    title_ar: String(formData.get('title_ar')),
    duration_min: Number(formData.get('duration_min') ?? 30),
    materials_ar: String(formData.get('materials_ar') ?? '') || null,
    quotient: isPrayer ? 'SQ' : primary,
    secondary_quotients: isPrayer ? [] : secondary,
    repeat_letter: isPrayer ? null : String(formData.get('repeat_letter') ?? '') || null,
    is_prayer: isPrayer,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/schedule');
  return { ok: true };
}
