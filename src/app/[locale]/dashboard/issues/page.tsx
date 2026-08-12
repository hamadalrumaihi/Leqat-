import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can, isStaff } from '@/lib/roles';
import { IssueForm } from '@/components/issue-form';
import { IssueTriage } from '@/components/issue-triage';

const PRIORITY_STYLE: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-secondary/60 text-secondary-foreground',
  high: 'bg-amber-500/15 text-amber-700',
  urgent: 'bg-destructive/10 text-destructive',
};
const STATUS_STYLE: Record<string, string> = {
  new: 'bg-accent/15 text-accent',
  acknowledged: 'bg-amber-500/15 text-amber-700',
  in_progress: 'bg-amber-500/15 text-amber-700',
  resolved: 'bg-green-vibrant/15 text-green-vibrant',
};

export default async function IssuesPage() {
  const user = await getActiveUser();
  const locale = await getLocale();
  if (!user || !isStaff(user.role)) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('issues');
  const canManage = can(user!.role, 'manageActivities');
  const supabase = await createClient();

  const { data } = await supabase
    .from('issues')
    .select('id, kind, location_ar, description_ar, priority, status, group_id, assigned_to, created_at, groups(name_ar), reporter:profiles!issues_reporter_id_fkey(full_name_ar)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as {
    id: string; kind: string; location_ar: string | null; description_ar: string;
    priority: string; status: string; group_id: string | null; assigned_to: string | null;
    created_at: string; groups: { name_ar: string } | null; reporter: { full_name_ar: string } | null;
  }[];

  // Reference data for the report form (groups) + triage (staff to assign).
  let programId: string | null = null;
  let groups: { id: string; label: string }[] = [];
  let staff: { id: string; label: string }[] = [];
  const [{ data: progs }, { data: g }] = await Promise.all([
    supabase.from('programs').select('id').order('created_at', { ascending: true }).limit(1),
    supabase.from('groups').select('id, name_ar'),
  ]);
  programId = (progs?.[0]?.id as string) ?? null;
  groups = (g ?? []).map((x) => ({ id: x.id as string, label: x.name_ar as string }));
  if (canManage) {
    const { data: sp } = await supabase
      .from('profiles')
      .select('id, full_name_ar')
      .not('role', 'in', '(parent,student)');
    staff = (sp ?? []).map((x) => ({ id: x.id as string, label: x.full_name_ar as string }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <IssueForm programId={programId} groups={groups} />
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">{t('empty')}</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((i) => (
            <li key={i.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{t(`kinds.${i.kind}`)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[i.priority] ?? ''}`}>
                  {t(`prio.${i.priority}`)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[i.status] ?? ''}`}>
                  {t(`statusv.${i.status}`)}
                </span>
              </div>
              <p className="mt-2 text-sm">{i.description_ar}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {i.groups?.name_ar ? <span>{i.groups.name_ar}</span> : null}
                {i.location_ar ? <span>📍 {i.location_ar}</span> : null}
                {i.reporter?.full_name_ar ? <span>{t('reportedBy')}: {i.reporter.full_name_ar}</span> : null}
              </div>
              {canManage && (
                <div className="mt-3">
                  <IssueTriage
                    id={i.id}
                    status={i.status}
                    priority={i.priority}
                    assignedTo={i.assigned_to}
                    staff={staff}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
