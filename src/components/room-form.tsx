'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createRoomAction } from '@/app/[locale]/dashboard/rooms/actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function RoomForm({ programs }: { programs: { id: string; name_ar: string }[] }) {
  const t = useTranslations('rooms');
  const [state, action] = useFormState(createRoomAction, null as null | { ok?: boolean; error?: string });

  if (programs.length === 0) {
    return <div className="card p-6 text-center text-muted-foreground">{t('none')}</div>;
  }

  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">{t('program')}</label>
        <select name="program_id" className="input" required>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name_ar}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{t('name')}</label>
        <input name="name_ar" className="input" required />
      </div>
      <div>
        <label className="label">{t('capacity')}</label>
        <input name="capacity" type="number" min={1} inputMode="numeric" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t('notes')}</label>
        <input name="notes_ar" className="input" />
      </div>
      {state?.error && (
        <p className="sm:col-span-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {state.error === 'forbidden' ? '—' : state.error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Submit label={t('create')} />
      </div>
    </form>
  );
}
