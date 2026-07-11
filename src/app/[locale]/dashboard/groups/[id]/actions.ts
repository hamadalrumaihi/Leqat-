'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';
import { ROSTER_SELECT, mapRosterRows, type RosterStudent } from '@/lib/roster';
import { can } from '@/lib/roles';

export async function searchUnassignedStudents(
  groupId: string,
  query: string,
  showAllAges: boolean,
): Promise<RosterStudent[]> {
  if (!query || query.trim().length < 2) return [];
  const supabase = await createClient();

  const { data: group } = await supabase
    .from('groups')
    .select('program_id, programs(age_grp)')
    .eq('id', groupId)
    .single();
  if (!group) return [];

  let q = supabase
    .from('enrollments')
    .select(ROSTER_SELECT)
    .eq('program_id', (group as { program_id: string }).program_id)
    .is('group_id', null);

  if (!showAllAges) {
    const prog = (group as { programs: unknown }).programs as
      | { age_grp: string | null }
      | { age_grp: string | null }[]
      | null;
    const age = Array.isArray(prog) ? prog[0]?.age_grp : prog?.age_grp;
    if (age) q = q.eq('students.age_grp', age);
  }

  const term = query.trim().replace(/[%,]/g, '');
  q = q.or(`full_name_ar.ilike.%${term}%,full_name_en.ilike.%${term}%`, {
    referencedTable: 'students',
  });

  const { data, error } = await q.limit(20);
  if (error) throw error;
  return mapRosterRows(data ?? []);
}

export async function addStudentToGroup(enrollmentId: string, groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('enrollments')
    .update({ group_id: groupId })
    .eq('id', enrollmentId);
  if (error) throw error;
  revalidatePath('/[locale]/dashboard/groups/[id]', 'page');
  return { success: true };
}

export async function removeStudentFromGroup(enrollmentId: string, groupId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('enrollments')
    .update({ group_id: null })
    .eq('id', enrollmentId);
  if (error) throw error;
  revalidatePath('/[locale]/dashboard/groups/[id]', 'page');
  return { success: true };
}

// Staff correcting a parent's contact number. Runs as the user via
// the update_parent_phone RPC (0010), which verifies server-side that
// the caller staffs a group/program containing one of that parent's
// children — no service role, no all-parents write surface.
export async function updateParentPhone(parentId: string, phone: string) {
  const user = await getCurrentUser();
  if (!can(user?.role, 'manageRoster')) {
    return { error: 'forbidden' };
  }
  const clean = phone.trim();
  if (!clean) return { error: 'empty' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('update_parent_phone', {
    parent: parentId,
    new_phone: clean,
  });
  if (error) {
    return { error: error.message.includes('not_authorized') ? 'forbidden' : error.message };
  }

  await audit('parent.phone_update', 'profiles', parentId);
  revalidatePath('/[locale]/dashboard/groups/[id]', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
  return { success: true };
}
