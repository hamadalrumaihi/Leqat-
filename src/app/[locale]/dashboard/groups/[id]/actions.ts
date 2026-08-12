'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/auth';
import { getActiveUser } from '@/lib/program-context';
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
    .select('program_id, programs(age_grp, age_grps)')
    .eq('id', groupId)
    .single();
  if (!group) return [];

  let q = supabase
    .from('enrollments')
    .select(ROSTER_SELECT)
    .eq('program_id', (group as { program_id: string }).program_id)
    .is('group_id', null);

  if (!showAllAges) {
    type Prog = { age_grp: string | null; age_grps: string[] | null };
    const prog = (group as { programs: unknown }).programs as Prog | Prog[] | null;
    const p = Array.isArray(prog) ? prog[0] : prog;
    // A program may target several age categories; fall back to the
    // legacy single value for rows created before the array existed.
    const ages = (p?.age_grps?.length ? p.age_grps : [p?.age_grp]).filter(
      (a): a is string => Boolean(a),
    );
    if (ages.length > 0) q = q.in('students.age_grp', ages);
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
  const user = await getActiveUser();
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
