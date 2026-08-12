'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can } from '@/lib/roles';
import { notify, announcementRecipients } from '@/lib/notify';

const AUDIENCES = [
  'all_staff',
  'executives',
  'managers',
  'group_supervisors',
  'specialist_teachers',
  'group',
  'teacher',
] as const;

export async function createAnnouncementAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  // manageActivities is the management gate; announcements are a
  // management action too (planning folded into Manager).
  if (!user || !can(user.role, 'manageActivities')) return { error: 'forbidden' };

  const title = String(formData.get('title_ar') ?? '').trim();
  const audience = String(formData.get('audience') ?? '');
  if (!title || !AUDIENCES.includes(audience as (typeof AUDIENCES)[number])) return { error: 'missing' };

  const targetGroup = audience === 'group' ? String(formData.get('target_group_id') ?? '') || null : null;
  const targetProfile = audience === 'teacher' ? String(formData.get('target_profile_id') ?? '') || null : null;
  if (audience === 'group' && !targetGroup) return { error: 'need_group' };
  if (audience === 'teacher' && !targetProfile) return { error: 'need_teacher' };

  const body = String(formData.get('body_ar') ?? '').trim() || null;
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').insert({
    program_id: String(formData.get('program_id') ?? '') || null,
    title_ar: title,
    body_ar: body,
    audience,
    target_group_id: targetGroup,
    target_profile_id: targetProfile,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  // Fan out an in-app notification to the audience (best-effort).
  const recipients = await announcementRecipients({
    audience,
    targetGroupId: targetGroup,
    targetProfileId: targetProfile,
    exclude: user.id,
  });
  await notify(recipients, { kind: 'announcement', title_ar: title, body_ar: body, href: '/dashboard/announcements' });

  revalidatePath('/dashboard/announcements');
  return { ok: true };
}

export async function deleteAnnouncementAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'manageActivities')) return { error: 'forbidden' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', String(formData.get('id') ?? ''));
  if (error) return { error: error.message };
  revalidatePath('/dashboard/announcements');
  return { ok: true };
}
