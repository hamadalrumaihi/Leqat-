'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { reportIssueAction } from '@/app/[locale]/dashboard/issues/actions';

type Opt = { id: string; label: string };
const KINDS = [
  'missing_participant', 'attendance', 'teacher_delay', 'room_conflict',
  'missing_materials', 'activity_delay', 'safety', 'technical', 'transportation', 'other',
] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function IssueForm({ programId, groups }: { programId: string | null; groups: Opt[] }) {
  const t = useTranslations('issues');
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(reportIssueAction, null as null | { ok?: boolean; error?: string });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary h-10 px-4">
        {t('report')}
      </button>
    );
  }

  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-2">
      {programId && <input type="hidden" name="program_id" value={programId} />}
      <div>
        <label className="label">{t('kind')}</label>
        <select name="kind" className="input" defaultValue="other">
          {KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t('priority')}</label>
        <select name="priority" className="input" defaultValue="normal">
          {PRIORITIES.map((p) => <option key={p} value={p}>{t(`prio.${p}`)}</option>)}
        </select>
      </div>
      {groups.length > 0 && (
        <div>
          <label className="label">{t('group')}</label>
          <select name="group_id" className="input">
            <option value="">—</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label">{t('location')}</label>
        <input name="location_ar" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t('description')}</label>
        <textarea name="description_ar" rows={2} className="input h-auto py-2" required />
      </div>
      {state?.error && (
        <p className="sm:col-span-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {state.error === 'forbidden' ? '—' : state.error}
        </p>
      )}
      <div className="sm:col-span-2 flex gap-2">
        <Submit label={t('submit')} />
        <button type="button" onClick={() => setOpen(false)} className="btn-outline h-10 px-4">✕</button>
      </div>
    </form>
  );
}
