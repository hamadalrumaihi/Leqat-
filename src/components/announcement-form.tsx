'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createAnnouncementAction } from '@/app/[locale]/dashboard/announcements/actions';

type Opt = { id: string; label: string };
const AUDIENCES = [
  'all_staff',
  'executives',
  'managers',
  'group_supervisors',
  'specialist_teachers',
  'group',
  'teacher',
] as const;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function AnnouncementForm({
  programId,
  groups,
  teachers,
}: {
  programId: string | null;
  groups: Opt[];
  teachers: Opt[];
}) {
  const t = useTranslations('announce');
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<string>('all_staff');
  const [state, action] = useFormState(createAnnouncementAction, null as null | { ok?: boolean; error?: string });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary h-10 px-4">
        {t('create')}
      </button>
    );
  }

  return (
    <form action={action} className="card grid gap-3 p-5">
      {programId && <input type="hidden" name="program_id" value={programId} />}
      <div>
        <label className="label">{t('titleField')}</label>
        <input name="title_ar" className="input" required />
      </div>
      <div>
        <label className="label">{t('body')}</label>
        <textarea name="body_ar" rows={2} className="input h-auto py-2" />
      </div>
      <div>
        <label className="label">{t('audience')}</label>
        <select name="audience" value={audience} onChange={(e) => setAudience(e.target.value)} className="input">
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>{t(`aud.${a}`)}</option>
          ))}
        </select>
      </div>
      {audience === 'group' && (
        <div>
          <label className="label">{t('targetGroup')}</label>
          <select name="target_group_id" className="input" required>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>
      )}
      {audience === 'teacher' && (
        <div>
          <label className="label">{t('targetTeacher')}</label>
          <select name="target_profile_id" className="input" required>
            {teachers.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
      )}
      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {state.error === 'forbidden' ? '—' : state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Submit label={t('publish')} />
        <button type="button" onClick={() => setOpen(false)} className="btn-outline h-10 px-4">✕</button>
      </div>
    </form>
  );
}
