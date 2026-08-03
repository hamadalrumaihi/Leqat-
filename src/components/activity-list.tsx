'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { setActivityStatusAction } from '@/app/[locale]/dashboard/activities/actions';

export type ActivityRow = {
  id: string;
  title_ar: string;
  category: string | null;
  objective_ar: string | null;
  duration_min: number;
  age_grp: string | null;
  max_group_size: number | null;
  status: string;
};

const STATUS_STYLE: Record<string, string> = {
  proposed: 'bg-muted text-muted-foreground',
  under_review: 'bg-amber-500/15 text-amber-700',
  approved: 'bg-green-vibrant/15 text-green-vibrant',
  needs_revision: 'bg-amber-500/15 text-amber-700',
  rejected: 'bg-destructive/10 text-destructive',
  archived: 'bg-muted text-muted-foreground',
};

function SubmitBtn({ label, variant }: { label: string; variant: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`h-8 rounded-md px-3 text-xs font-medium ${variant}`}>
      {pending ? '…' : label}
    </button>
  );
}

function StatusButton({ id, to, label, variant }: { id: string; to: string; label: string; variant: string }) {
  const [, action] = useFormState(setActivityStatusAction, null);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={to} />
      <SubmitBtn label={label} variant={variant} />
    </form>
  );
}

export function ActivityList({ activities, canManage }: { activities: ActivityRow[]; canManage: boolean }) {
  const t = useTranslations('activities');

  if (activities.length === 0) {
    return <div className="card p-8 text-center text-muted-foreground">{t('empty')}</div>;
  }

  return (
    <ul className="space-y-3">
      {activities.map((a) => (
        <li key={a.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">{a.title_ar}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[a.status] ?? 'bg-muted'}`}>
              {t(`status.${a.status}`)}
            </span>
          </div>
          {a.objective_ar ? <p className="mt-1 text-sm text-muted-foreground">{a.objective_ar}</p> : null}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {a.category ? <span>{a.category}</span> : null}
            <span>{a.duration_min} د</span>
            {a.max_group_size ? <span>{t('maxGroup')}: {a.max_group_size}</span> : null}
          </div>

          {canManage && a.status !== 'archived' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {a.status !== 'approved' && (
                <StatusButton id={a.id} to="approved" label={t('approve')} variant="bg-primary text-primary-foreground" />
              )}
              {a.status !== 'needs_revision' && a.status !== 'approved' && (
                <StatusButton id={a.id} to="needs_revision" label={t('requestChanges')} variant="border border-input bg-background" />
              )}
              {a.status !== 'rejected' && a.status !== 'approved' && (
                <StatusButton id={a.id} to="rejected" label={t('reject')} variant="border border-input bg-background text-destructive" />
              )}
              <StatusButton id={a.id} to="archived" label={t('archive')} variant="border border-input bg-background" />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
