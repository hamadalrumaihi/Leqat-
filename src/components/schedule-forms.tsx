'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  createSessionAction,
  publishSessionAction,
  createStationAction,
} from '@/app/[locale]/dashboard/schedule/actions';
import { REPEAT_LETTERS, QUOTIENT_COLOR, QUOTIENT_NAME, cn } from '@/lib/utils';

const QUOTIENTS = ['SQ', 'EQ', 'IQ', 'PQ'] as const;

function Submit({ label, sm }: { label: string; sm?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={sm ? 'btn-outline h-9 px-3 text-xs' : 'btn-primary h-10 px-4'}
      disabled={pending}
    >
      {pending ? '…' : label}
    </button>
  );
}

export function SessionCreate({
  programs,
  groups,
  ramadan,
}: {
  programs: { id: string; name_ar: string }[];
  groups: { id: string; name_ar: string; program_id: string }[];
  ramadan: boolean;
}) {
  const [, action] = useFormState(createSessionAction, null);
  if (programs.length === 0) return null;
  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className="label">البرنامج</label>
        <select name="program_id" className="input">
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name_ar}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">المجموعة</label>
        <select name="group_id" className="input">
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name_ar}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">الأسبوع</label>
        <input name="week_no" type="number" min="1" className="input" />
      </div>
      <div>
        <label className="label">التاريخ</label>
        <input name="date" type="date" className="input" dir="ltr" required />
      </div>
      <div>
        <label className="label">البداية</label>
        <input name="start_time" type="time" defaultValue={ramadan ? '19:00' : '16:00'} className="input" dir="ltr" />
      </div>
      <div>
        <label className="label">النهاية</label>
        <input name="end_time" type="time" defaultValue={ramadan ? '23:45' : '20:00'} className="input" dir="ltr" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Submit label="إضافة جلسة" />
      </div>
    </form>
  );
}

export function PublishButton({ sessionId }: { sessionId: string }) {
  const [state, action] = useFormState(publishSessionAction, null as null | { ok?: boolean });
  return (
    <form action={action}>
      <input type="hidden" name="session_id" value={sessionId} />
      <Submit label="نشر للمشرف" sm />
      {state?.ok && <span className="ms-2 text-xs text-green-vibrant">تم النشر</span>}
    </form>
  );
}

export function StationForm({
  sessionId,
  nextIndex,
}: {
  sessionId: string;
  nextIndex: number;
}) {
  const [, action] = useFormState(createStationAction, null);
  const [prayer, setPrayer] = useState(false);
  const [repeat, setRepeat] = useState('');
  const [primary, setPrimary] = useState('SQ');
  const [secondary, setSecondary] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline h-9 px-3 text-xs">
        + إضافة محطة
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-3 rounded-md border bg-background p-4">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="order_index" value={nextIndex} />
      <input type="hidden" name="repeat_letter" value={prayer ? '' : repeat} />
      <input type="hidden" name="quotient" value={prayer ? 'SQ' : primary} />
      {!prayer &&
        secondary.map((s) => (
          <input key={s} type="hidden" name="secondary_quotients" value={s} />
        ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">عنوان المحطة</label>
          <input name="title_ar" className="input" required />
        </div>
        <div>
          <label className="label">المدة (دقائق)</label>
          <input name="duration_min" type="number" min="5" defaultValue={30} className="input" />
        </div>
      </div>
      <div>
        <label className="label">المواد المطلوبة</label>
        <input name="materials_ar" className="input" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_prayer" checked={prayer} onChange={(e) => setPrayer(e.target.checked)} />
        محطة صلاة (تُضبط تلقائيًا على البعد الروحي SQ)
      </label>

      {!prayer && (
        <>
          <div>
            <p className="label">البعد الأساسي</p>
            <div className="flex gap-2">
              {QUOTIENTS.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => {
                    setPrimary(q);
                    setSecondary((s) => s.filter((x) => x !== q));
                  }}
                  className={cn('flex flex-col items-center rounded-md px-3 py-1.5 text-sm font-semibold', primary === q ? 'text-white' : 'bg-muted')}
                  style={primary === q ? { backgroundColor: QUOTIENT_COLOR[q] } : undefined}
                >
                  <span className="latin-term">{q}</span>
                  <span className="text-[10px] font-normal">{QUOTIENT_NAME[q]?.ar}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label">أبعاد ثانوية</p>
            <div className="flex gap-2">
              {QUOTIENTS.filter((q) => q !== primary).map((q) => {
                const on = secondary.includes(q);
                return (
                  <button
                    type="button"
                    key={q}
                    onClick={() =>
                      setSecondary((s) => (on ? s.filter((x) => x !== q) : [...s, q]))
                    }
                    className={cn('rounded-full border px-3 py-1 text-xs', on ? 'border-accent bg-accent/15 text-accent' : 'text-muted-foreground')}
                  >
                    {q} — {QUOTIENT_NAME[q]?.ar}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="label">حرف REPEAT</p>
            <div className="flex flex-wrap gap-2">
              {REPEAT_LETTERS.map((r) => (
                <button
                  type="button"
                  key={r.code}
                  title={r.phrase}
                  onClick={() => setRepeat((cur) => (cur === r.code ? '' : r.code))}
                  className={cn(
                    'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs',
                    repeat === r.code ? 'border-primary bg-secondary text-primary' : 'text-muted-foreground',
                  )}
                >
                  <span className="latin-term font-bold">{r.code}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Submit label="حفظ المحطة" sm />
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost h-9 px-3 text-xs">
          إلغاء
        </button>
      </div>
    </form>
  );
}
