'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can, isStaff } from '@/lib/roles';
import { notify } from '@/lib/notify';

const KINDS = [
  'missing_participant', 'attendance', 'teacher_delay', 'room_conflict',
  'missing_materials', 'activity_delay', 'safety', 'technical',
  'transportation', 'other',
] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const STATUSES = ['new', 'acknowledged', 'in_progress', 'resolved'] as const;

export async function reportIssueAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !isStaff(user.role)) return { error: 'forbidden' };

  const description = String(formData.get('description_ar') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'other');
  const priority = String(formData.get('priority') ?? 'normal');
  if (!description || !KINDS.includes(kind as (typeof KINDS)[number])) return { error: 'missing' };

  const supabase = await createClient();
  const { error } = await supabase.from('issues').insert({
    program_id: String(formData.get('program_id') ?? '') || null,
    group_id: String(formData.get('group_id') ?? '') || null,
    reporter_id: user.id, // RLS check enforces this equals auth.uid()
    kind,
    location_ar: String(formData.get('location_ar') ?? '').trim() || null,
    description_ar: description,
    priority: PRIORITIES.includes(priority as (typeof PRIORITIES)[number]) ? priority : 'normal',
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/issues');
  return { ok: true };
}

// Management-only triage: status, priority, assignment. RLS ("management
// triages issues") is the real guard.
export async function triageIssueAction(_: unknown, formData: FormData) {
  const user = await getActiveUser();
  if (!user || !can(user.role, 'manageActivities')) return { error: 'forbidden' };

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  const priority = String(formData.get('priority') ?? '');
  if (!id || !STATUSES.includes(status as (typeof STATUSES)[number])) return { error: 'invalid' };

  const assignedTo = String(formData.get('assigned_to') ?? '') || null;
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    resolved_at: status === 'resolved' ? new Date().toISOString() : null,
    assigned_to: assignedTo,
  };
  if (PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) patch.priority = priority;

  const supabase = await createClient();
  // Read the prior assignee so we only notify on a NEW assignment.
  const { data: before } = await supabase.from('issues').select('assigned_to, description_ar').eq('id', id).maybeSingle();
  const { error } = await supabase.from('issues').update(patch).eq('id', id);
  if (error) return { error: error.message };

  if (assignedTo && assignedTo !== user.id && (before as { assigned_to: string | null } | null)?.assigned_to !== assignedTo) {
    await notify([assignedTo], {
      kind: 'issue_assigned',
      title_ar: 'أُسند إليك بلاغ',
      body_ar: (before as { description_ar: string } | null)?.description_ar ?? null,
      href: '/dashboard/issues',
    });
  }

  revalidatePath('/dashboard/issues');
  return { ok: true };
}
