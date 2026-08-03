'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { triageIssueAction } from '@/app/[locale]/dashboard/issues/actions';

type Opt = { id: string; label: string };
const STATUSES = ['new', 'acknowledged', 'in_progress', 'resolved'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-9 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function IssueTriage({
  id,
  status,
  priority,
  assignedTo,
  staff,
}: {
  id: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  staff: Opt[];
}) {
  const t = useTranslations('issues');
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(triageIssueAction, null as null | { ok?: boolean; error?: string });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="h-8 rounded-md border border-input px-3 text-xs">
        {t('triage')}
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 w-full space-y-2 rounded-md border bg-background p-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap gap-2">
        <select name="status" defaultValue={status} className="input h-9 w-auto">
          {STATUSES.map((s) => <option key={s} value={s}>{t(`statusv.${s}`)}</option>)}
        </select>
        <select name="priority" defaultValue={priority} className="input h-9 w-auto">
          {PRIORITIES.map((p) => <option key={p} value={p}>{t(`prio.${p}`)}</option>)}
        </select>
        <select name="assigned_to" defaultValue={assignedTo ?? ''} className="input h-9 w-auto">
          <option value="">{t('unassigned')}</option>
          {staff.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </div>
      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {state.error === 'forbidden' ? '—' : state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Save label={t('save')} />
        <button type="button" onClick={() => setOpen(false)} className="btn-outline h-9 px-4">✕</button>
      </div>
    </form>
  );
}
