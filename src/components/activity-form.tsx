'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { proposeActivityAction } from '@/app/[locale]/dashboard/activities/actions';
import { VISIBLE_AGE_GROUPS, AGE_LABEL_AR } from '@/lib/age-groups';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function ActivityForm() {
  const t = useTranslations('activities');
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(proposeActivityAction, null as null | { ok?: boolean; error?: string });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary h-10 px-4">
        {t('propose')}
      </button>
    );
  }

  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">{t('name')}</label>
        <input name="title_ar" className="input" required />
      </div>
      <div>
        <label className="label">{t('category')}</label>
        <input name="category" className="input" />
      </div>
      <div>
        <label className="label">{t('level')}</label>
        <select name="age_grp" className="input">
          <option value="">—</option>
          {VISIBLE_AGE_GROUPS.map((g) => (
            <option key={g} value={g}>{AGE_LABEL_AR[g]}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t('objective')}</label>
        <input name="objective_ar" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t('description')}</label>
        <textarea name="description_ar" rows={2} className="input h-auto py-2" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t('instructions')}</label>
        <textarea name="instructions_ar" rows={2} className="input h-auto py-2" />
      </div>
      <div>
        <label className="label">{t('duration')}</label>
        <input name="duration_min" type="number" min={5} inputMode="numeric" defaultValue={45} className="input" />
      </div>
      <div>
        <label className="label">{t('maxGroup')}</label>
        <input name="max_group_size" type="number" min={1} inputMode="numeric" className="input" />
      </div>
      <div>
        <label className="label">{t('materials')}</label>
        <input name="materials_ar" className="input" />
      </div>
      <div>
        <label className="label">{t('prep')}</label>
        <input name="prep_ar" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t('safety')}</label>
        <input name="safety_ar" className="input" />
      </div>
      {state?.error && (
        <p className="sm:col-span-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {state.error === 'forbidden' ? '—' : state.error}
        </p>
      )}
      <div className="sm:col-span-2 flex gap-2">
        <Submit label={t('save')} />
        <button type="button" onClick={() => setOpen(false)} className="btn-outline h-10 px-4">
          ✕
        </button>
      </div>
    </form>
  );
}
