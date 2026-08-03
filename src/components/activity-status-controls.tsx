'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { updateActivityStatusAction } from '@/app/[locale]/dashboard/master-schedule/status-actions';
import { EXEC_STATUSES as STATUSES } from '@/lib/exec-status';

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-9 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function ActivityStatusControls({
  id,
  status,
  note,
  support,
}: {
  id: string;
  status: string;
  note: string | null;
  support: boolean;
}) {
  const t = useTranslations('exec');
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(updateActivityStatusAction, null as null | { ok?: boolean; error?: string });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="h-8 rounded-md border border-input px-3 text-xs">
        {t('update')}
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 w-full space-y-2 rounded-md border bg-background p-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">{t('statusLabel')}</label>
        <select name="status" defaultValue={status} className="input h-9 w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>
      </div>
      <input name="note" defaultValue={note ?? ''} placeholder={t('notePlaceholder')} className="input h-9" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="support" defaultChecked={support} />
        {t('requestSupport')}
      </label>
      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {state.error === 'forbidden' ? t('forbidden') : state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Save label={t('save')} />
        <button type="button" onClick={() => setOpen(false)} className="btn-outline h-9 px-4">✕</button>
      </div>
    </form>
  );
}
