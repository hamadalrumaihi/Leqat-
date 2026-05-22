'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';
import { effectiveRole } from '@/lib/utils';
import { ROSTER_SELECT, mapRosterRows, type RosterStudent } from '@/lib/roster';

const STAFF = ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'];

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

// Staff correcting a parent's contact number. Parent profiles aren't
// writable by supervisors under RLS, so this runs with the service
// role and is audit-logged. Gated to staff roles.
export async function updateParentPhone(parentId: string, phone: string) {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(effectiveRole(user.role))) {
    return { error: 'forbidden' };
  }
  const clean = phone.trim();
  if (!clean) return { error: 'empty' };

  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ phone: clean }).eq('id', parentId);
  if (error) return { error: error.message };

  await audit('parent.phone_update', 'profiles', parentId);
  revalidatePath('/[locale]/dashboard/groups/[id]', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
  return { success: true };
}
