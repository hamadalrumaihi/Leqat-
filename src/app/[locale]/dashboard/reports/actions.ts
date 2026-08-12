'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/auth';
import { getActiveUser } from '@/lib/program-context';
import { draftReportArabic, type StationLite } from '@/lib/ai';
import { effectiveRole } from '@/lib/utils';

// Upward workflow — 3 stages under the new hierarchy (option 8a):
//   draft → submitted_manager (Group Supervisor)
//         → submitted_executive (Manager)
//         → approved (Executive/Founder)
// The retired middle stage `submitted_supervisor` is kept only as a
// compat entry so any in-flight report already sitting there still
// advances (to submitted_executive, by a Manager). `role` values are
// EFFECTIVE roles, compared through effectiveRole.
const NEXT_STAGE: Record<string, { to: string; role: string }> = {
  draft: { to: 'submitted_manager', role: 'group_supervisor' },
  submitted_manager: { to: 'submitted_executive', role: 'manager' },
  submitted_supervisor: { to: 'submitted_executive', role: 'manager' }, // compat
  submitted_executive: { to: 'approved', role: 'executive' },
};

export async function aiDraftAction(
  _: unknown,
  formData: FormData,
): Promise<{ summaryAr?: string; highlightsAr?: string; aiAssisted?: boolean; error?: string }> {
  const sessionId = String(formData.get('session_id'));
  const rawNotes = String(formData.get('raw_notes') ?? '').trim();
  if (!rawNotes) return { error: 'empty' };

  const supabase = await createClient();
  const { data: stations } = await supabase
    .from('stations')
    .select('title_ar, quotient')
    .eq('session_id', sessionId)
    .order('order_index', { ascending: true });

  const draft = await draftReportArabic(rawNotes, (stations ?? []) as StationLite[]);
  return draft;
}

export async function saveReportAction(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const sessionId = String(formData.get('session_id'));

  const { data: session } = await supabase
    .from('sessions')
    .select('group_id')
    .eq('id', sessionId)
    .single();
  if (!session) return { error: 'no_session' };

  const quotientTags = formData.getAll('quotient_tags').map(String);
  const skillTags = formData.getAll('skill_tags').map(String);
  const repeatTags = formData.getAll('repeat_tags').map(String);

  const { error } = await supabase.from('reports').upsert(
    {
      session_id: sessionId,
      group_id: (session as { group_id: string }).group_id,
      summary_ar: String(formData.get('summary_ar') ?? ''),
      highlights_ar: String(formData.get('highlights_ar') ?? ''),
      quotient_tags: quotientTags,
      skill_tags: skillTags,
      repeat_tags: repeatTags,
      ai_assisted: formData.get('ai_assisted') === 'true',
      stage: 'draft',
    },
    { onConflict: 'session_id' },
  );
  if (error) return { error: error.message };

  revalidatePath('/dashboard/reports');
  return { ok: true };
}

export async function advanceReportAction(_: unknown, formData: FormData) {
  const reportId = String(formData.get('report_id'));
  const user = await getActiveUser();
  if (!user) return { error: 'unauthenticated' };

  const supabase = await createClient();
  const { data: report } = await supabase
    .from('reports')
    .select('stage')
    .eq('id', reportId)
    .single();
  if (!report) return { error: 'not_found' };

  const stage = (report as { stage: string }).stage;
  const step = NEXT_STAGE[stage];
  if (!step) return { error: 'terminal' };

  // Server-side role gate (effective roles). Executive and Founder may
  // advance any stage; otherwise the caller's effective role must match
  // the transition's designated approver.
  const eff = effectiveRole(user.role);
  if (eff !== step.role && eff !== 'executive' && eff !== 'founder') {
    return { error: 'forbidden' };
  }

  const { error } = await supabase
    .from('reports')
    .update({ stage: step.to, updated_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) return { error: error.message };

  await audit('report.advance', 'reports', reportId, { from: stage, to: step.to });
  revalidatePath('/dashboard/reports');
  return { ok: true, to: step.to };
}
