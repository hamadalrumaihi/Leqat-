'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  deleteScheduleEntryAction,
  publishDayAction,
} from '@/app/[locale]/dashboard/master-schedule/actions';

function Pending({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? '…' : label}
    </button>
  );
}

export function DeleteEntryButton({ id }: { id: string }) {
  const [, action] = useFormState(deleteScheduleEntryAction, null);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <Pending label="✕" className="h-8 w-8 rounded-md border border-input text-muted-foreground hover:bg-muted" />
    </form>
  );
}

export function PublishDayButton({ programId, date }: { programId: string; date: string }) {
  const t = useTranslations('scheduleOps');
  const [state, action] = useFormState(publishDayAction, null as null | { ok?: boolean; error?: string });
  return (
    <form action={action} className="inline">
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="date" value={date} />
      <Pending label={t('publishDay')} className="btn-outline h-9 px-4" />
      {state?.ok && <span className="ms-2 text-xs text-green-vibrant">{t('published')}</span>}
    </form>
  );
}
