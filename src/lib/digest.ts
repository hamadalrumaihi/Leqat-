import type { SupabaseClient } from '@supabase/supabase-js';
import { qatarToday } from '@/lib/utils';

// Builds the Thursday weekly-digest email body for one parent.
// Uses a service-role client (cron context, no user session) so it
// must scope every query by the parent's own children explicitly.

export type DigestEmail = { to: string; subject: string; html: string };

export async function buildParentDigest(
  admin: SupabaseClient,
  parent: { id: string; email: string | null; full_name_ar: string },
): Promise<DigestEmail | null> {
  if (!parent.email) return null;

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('group_id, students!inner(parent_id)')
    .eq('students.parent_id', parent.id)
    .not('group_id', 'is', null);
  const groupIds = [...new Set((enrollments ?? []).map((e) => e.group_id))];
  if (groupIds.length === 0) return null;

  const today = qatarToday();
  const [{ data: report }, { data: next }] = await Promise.all([
    admin
      .from('reports')
      .select('summary_ar, created_at')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('sessions')
      .select('date')
      .in('group_id', groupIds)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const html = `
  <div dir="rtl" style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#1F5C3A">برنامج مهندس الحياة — الملخص الأسبوعي</h2>
    <p>مرحبًا ${parent.full_name_ar}،</p>
    <h3>آخر تقرير</h3>
    <p>${report?.summary_ar ?? 'لا يوجد تقرير جديد هذا الأسبوع.'}</p>
    <h3>الجلسة القادمة</h3>
    <p>${next?.date ? `بتاريخ ${next.date}` : 'لم تُجدوَل بعد.'}</p>
    <hr/>
    <p style="color:#8A8F98;font-size:12px">برنامج مهندس الحياة — قطر</p>
  </div>`;

  return {
    to: parent.email,
    subject: 'برنامج مهندس الحياة — ملخصك الأسبوعي',
    html,
  };
}
