'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createSlipAction } from '@/app/[locale]/dashboard/slips/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : 'إنشاء إذن'}
    </button>
  );
}

export function SlipCreate({
  programs,
}: {
  programs: { id: string; name_ar: string }[];
}) {
  const [, action] = useFormState(createSlipAction, null);
  if (programs.length === 0) return null;

  return (
    <form action={action} className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">البرنامج</label>
          <select name="program_id" className="input">
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">تاريخ الاستحقاق</label>
          <input name="due_date" type="date" className="input" dir="ltr" />
        </div>
      </div>
      <div>
        <label className="label">عنوان الإذن</label>
        <input name="title_ar" className="input" required placeholder="إذن مشاركة في رحلة تعليمية" />
      </div>
      <div>
        <label className="label">نص الإذن</label>
        <textarea name="body_ar" rows={3} className="input h-auto py-2" required />
      </div>
      <Btn />
    </form>
  );
}
