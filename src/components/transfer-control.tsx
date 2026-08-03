'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { transferStudentAction } from '@/app/[locale]/dashboard/transfers/actions';

type Opt = { id: string; label: string };

function Save({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-9 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function TransferControl({
  enrollmentId,
  currentGroupId,
  groups,
}: {
  enrollmentId: string;
  currentGroupId: string | null;
  groups: Opt[];
}) {
  const t = useTranslations('transfers');
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(transferStudentAction, null as null | { ok?: boolean; error?: string });

  const dests = groups.filter((g) => g.id !== currentGroupId);
  if (dests.length === 0) return null;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="h-8 rounded-md border border-input px-3 text-xs">
        {t('transfer')}
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 w-full space-y-2 rounded-md border bg-background p-3">
      <input type="hidden" name="enrollment_id" value={enrollmentId} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">{t('toGroup')}</label>
        <select name="to_group_id" className="input h-9 w-auto" required>
          {dests.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>
      <input name="reason" placeholder={t('reason')} className="input h-9" />
      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {state.error === 'program_mismatch' ? t('mismatch')
            : state.error === 'already_in_group' ? t('already')
            : state.error === 'forbidden' ? '—' : state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Save label={t('confirm')} />
        <button type="button" onClick={() => setOpen(false)} className="btn-outline h-9 px-4">✕</button>
      </div>
    </form>
  );
}
