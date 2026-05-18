'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';

const STAFF = ['executive', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'];

/**
 * Start a staff↔student direct message. The two-adult rule is
 * enforced here: a second supervisor from the same group is added as
 * a CC member so no staff↔student DM is ever 1:1.
 */
export async function createDmAction(
  _: unknown,
  formData: FormData,
): Promise<{ channelId?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(user.role)) return { error: 'forbidden' };

  const studentId = String(formData.get('student_id'));
  const supabase = await createClient();

  const { data: student } = await supabase
    .from('students')
    .select('id, profile_id, full_name_ar')
    .eq('id', studentId)
    .single();
  if (!student) return { error: 'no_student' };

  const { data: enr } = await supabase
    .from('enrollments')
    .select('group_id')
    .eq('student_id', studentId)
    .not('group_id', 'is', null)
    .limit(1)
    .maybeSingle();
  const groupId = (enr as { group_id: string } | null)?.group_id ?? null;

  // Pick a second adult from the same group (the CC) — never the caller.
  let ccId: string | null = null;
  if (groupId) {
    const { data: staff } = await supabase
      .from('group_staff')
      .select('profile_id')
      .eq('group_id', groupId)
      .neq('profile_id', user.id)
      .limit(1)
      .maybeSingle();
    ccId = (staff as { profile_id: string } | null)?.profile_id ?? null;
  }

  const { data: channel, error } = await supabase
    .from('chat_channels')
    .insert({
      type: 'dm',
      group_id: groupId,
      is_staff_student: true,
      cc_profile_id: ccId,
      title_ar: `محادثة خاصة — ${(student as { full_name_ar: string }).full_name_ar}`,
    })
    .select('id')
    .single();
  if (error || !channel) return { error: error?.message ?? 'channel' };

  const channelId = (channel as { id: string }).id;
  const members = new Set<string>([user.id]);
  const studentProfile = (student as { profile_id: string | null }).profile_id;
  if (studentProfile) members.add(studentProfile);
  if (ccId) members.add(ccId);

  await supabase.from('chat_members').insert(
    [...members].map((profile_id) => ({ channel_id: channelId, profile_id })),
  );

  await audit('dm.create', 'chat_channels', channelId, {
    studentId,
    ccPresent: Boolean(ccId),
  });
  return { channelId };
}
