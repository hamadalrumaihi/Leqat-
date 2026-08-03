'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createScheduleEntryAction } from '@/app/[locale]/dashboard/master-schedule/actions';

type Opt = { id: string; label: string };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function ScheduleEntryForm({
  programId,
  date,
  groups,
  activities,
  teachers,
  rooms,
}: {
  programId: string;
  date: string;
  groups: Opt[];
  activities: Opt[];
  teachers: Opt[];
  rooms: Opt[];
}) {
  const t = useTranslations('scheduleOps');
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(createScheduleEntryAction, null as null | { ok?: boolean; error?: string });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary h-10 px-4">
        {t('addEntry')}
      </button>
    );
  }

  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-2">
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="date" value={date} />
      <div>
        <label className="label">{t('group')}</label>
        <select name="group_id" className="input" required>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t('activity')}</label>
        <select name="activity_id" className="input">
          <option value="">—</option>
          {activities.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t('teacher')}</label>
        <select name="teacher_id" className="input">
          <option value="">—</option>
          {teachers.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t('room')}</label>
        <select name="room_id" className="input">
          <option value="">—</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t('start')}</label>
        <input name="start_time" type="time" dir="ltr" className="input" required />
      </div>
      <div>
        <label className="label">{t('end')}</label>
        <input name="end_time" type="time" dir="ltr" className="input" required />
      </div>
      {state?.error && (
        <p className="sm:col-span-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {state.error === 'bad_time' ? t('badTime') : state.error === 'forbidden' ? '—' : state.error}
        </p>
      )}
      <div className="sm:col-span-2 flex gap-2">
        <Submit label={t('save')} />
        <button type="button" onClick={() => setOpen(false)} className="btn-outline h-10 px-4">✕</button>
      </div>
    </form>
  );
}
