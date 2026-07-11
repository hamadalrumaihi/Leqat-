import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { effectiveRole } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { ReportAdvance } from '@/components/report-advance';
import { GroupSwatch } from '@/components/group-swatch';

const STAGE_KEY: Record<string, string> = {
  draft: 'stageDraft',
  submitted_manager: 'stageSubmitted',
  submitted_supervisor: 'stageSubmitted',
  submitted_executive: 'stageSubmitted',
  approved: 'stageApproved',
};

// next stage → { effective role allowed, Arabic action label }. 3-stage
// chain (8a): Group Supervisor → Manager → Executive. submitted_supervisor
// is a compat entry for in-flight reports.
const ADVANCE: Record<string, { role: string; label: string }> = {
  draft: { role: 'group_supervisor', label: 'رفع إلى المدير' },
  submitted_manager: { role: 'manager', label: 'رفع إلى التنفيذي' },
  submitted_supervisor: { role: 'manager', label: 'رفع إلى التنفيذي' },
  submitted_executive: { role: 'executive', label: 'اعتماد التقرير' },
};

export default async function ReportsPage() {
  const t = await getTranslations('reports');
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: reports } = await supabase
    .from('reports')
    .select('id, summary_ar, highlights_ar, quotient_tags, skill_tags, repeat_tags, stage, created_at, groups(name_ar, color)')
    .order('created_at', { ascending: false })
    .limit(50);

  const canEdit =
    user?.role === 'group_supervisor' ||
    user?.role === 'assistant_supervisor' ||
    user?.role === 'executive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {canEdit && (
          <Link href="/dashboard/reports/new" className="btn-primary h-10 px-4">
            تقرير جديد
          </Link>
        )}
      </div>
      {(reports ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">—</div>
      )}
      <div className="space-y-3">
        {(reports ?? []).map((r) => (
          <article key={r.id as string} className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-primary">
                <GroupSwatch color={(r.groups as unknown as { color: string | null } | null)?.color} />
                {(r.groups as unknown as { name_ar: string } | null)?.name_ar}
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                {t(STAGE_KEY[r.stage as string] ?? 'stageDraft')}
              </span>
            </div>
            <p className="text-sm">{r.summary_ar as string}</p>
            {r.highlights_ar ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t('highlights')}: {r.highlights_ar as string}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {((r.repeat_tags as string[]) ?? []).map((rt) => (
                <span key={rt} className="latin-term rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-primary">
                  {rt}
                </span>
              ))}
              {((r.quotient_tags as string[]) ?? []).map((q) => (
                <span key={q} className="latin-term rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {q}
                </span>
              ))}
              {((r.skill_tags as string[]) ?? []).map((s) => (
                <span key={s} className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  {s}
                </span>
              ))}
            </div>
            {(() => {
              const step = ADVANCE[r.stage as string];
              if (!step) return null;
              const eff = user ? effectiveRole(user.role) : '';
              const allowed = eff === step.role || eff === 'executive' || eff === 'founder';
              if (!allowed) return null;
              return (
                <div className="mt-4 border-t pt-3">
                  <ReportAdvance reportId={r.id as string} label={step.label} />
                </div>
              );
            })()}
          </article>
        ))}
      </div>
    </div>
  );
}
