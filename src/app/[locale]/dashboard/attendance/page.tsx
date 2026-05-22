import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { dualDate } from '@/lib/utils';
import { AttendanceList } from '@/components/attendance-list';
import { GroupSwatch } from '@/components/group-swatch';

export default async function AttendancePage() {
  const t = await getTranslations('attendance');
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();

  // Most recent session in a group the current user can access (RLS scoped).
  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, week_no, group_id, groups(name_ar, name_en, color)')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return (
      <div className="card p-8 text-center text-muted-foreground">
        {t('noSession')}
      </div>
    );
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id, students(id, full_name_ar, full_name_en)')
    .eq('group_id', session.group_id)
    .eq('status', 'active');

  const { data: existing } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('session_id', session.id);

  const roster = (enrollments ?? []).map((e) => {
    const st = e.students as unknown as {
      id: string;
      full_name_ar: string;
      full_name_en: string | null;
    };
    const rec = existing?.find((a) => a.student_id === st.id);
    return {
      id: st.id,
      nameAr: st.full_name_ar,
      nameEn: st.full_name_en,
      status: (rec?.status as string) ?? null,
    };
  });

  const group = session.groups as unknown as { name_ar: string; color: string | null } | null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <GroupSwatch color={group?.color} />
          {group?.name_ar} · {dualDate(session.date as string, locale)}
        </p>
      </div>
      <AttendanceList sessionId={session.id} roster={roster} />
    </div>
  );
}
