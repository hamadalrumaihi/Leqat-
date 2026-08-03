import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isManagement } from '@/lib/roles';
import { dualDate } from '@/lib/utils';
import { GroupSwatch } from '@/components/group-swatch';
import { TransferControl } from '@/components/transfer-control';

export default async function TransfersPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user || !isManagement(user.role)) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('transfers');
  const supabase = await createClient();

  const { data: program } = await supabase
    .from('programs')
    .select('id, name_ar')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!program) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="card p-8 text-center text-muted-foreground">{t('noProgram')}</div>
      </div>
    );
  }
  const programId = program.id as string;

  const [enrollRes, groupsRes, histRes] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, group_id, status, students(full_name_ar), groups(name_ar, color)')
      .eq('program_id', programId)
      .not('group_id', 'is', null)
      .order('created_at', { ascending: true }),
    supabase.from('groups').select('id, name_ar').eq('program_id', programId),
    supabase
      .from('group_assignment_history')
      .select('id, effective_at, reason, enrollment:enrollments(students(full_name_ar)), from_group:groups!group_assignment_history_from_group_id_fkey(name_ar), to_group:groups!group_assignment_history_to_group_id_fkey(name_ar)')
      .order('effective_at', { ascending: false })
      .limit(15),
  ]);

  const enrollments = (enrollRes.data ?? []) as unknown as {
    id: string; group_id: string | null; status: string;
    students: { full_name_ar: string } | null;
    groups: { name_ar: string; color: string | null } | null;
  }[];
  const groups = (groupsRes.data ?? []).map((g) => ({ id: g.id as string, label: g.name_ar as string }));
  const history = (histRes.data ?? []) as unknown as {
    id: string; effective_at: string; reason: string | null;
    enrollment: { students: { full_name_ar: string } | null } | null;
    from_group: { name_ar: string } | null;
    to_group: { name_ar: string } | null;
  }[];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{t('roster')}</h2>
        {enrollments.length === 0 ? (
          <div className="card p-8 text-center text-muted-foreground">{t('noStudents')}</div>
        ) : (
          <ul className="space-y-2">
            {enrollments.map((e) => (
              <li key={e.id} className="card flex flex-wrap items-center gap-3 p-4">
                <span className="font-medium">{e.students?.full_name_ar}</span>
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <GroupSwatch color={e.groups?.color ?? null} />
                  {e.groups?.name_ar}
                </span>
                <span className="ms-auto">
                  <TransferControl enrollmentId={e.id} currentGroupId={e.group_id} groups={groups} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{t('history')}</h2>
        {history.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted-foreground">{t('noHistory')}</div>
        ) : (
          <ul className="card divide-y p-0">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-2 p-4 text-sm">
                <span className="font-medium">{h.enrollment?.students?.full_name_ar ?? '—'}</span>
                <span className="text-muted-foreground">
                  {t('from')}: {h.from_group?.name_ar ?? t('unassigned')} · {t('to')}: {h.to_group?.name_ar ?? '—'}
                </span>
                {h.reason ? <span className="text-xs text-muted-foreground">· {h.reason}</span> : null}
                <span dir="ltr" className="ms-auto text-xs text-muted-foreground">
                  {dualDate(h.effective_at.slice(0, 10), locale as 'ar' | 'en')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
