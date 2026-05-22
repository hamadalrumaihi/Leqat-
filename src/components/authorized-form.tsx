'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addAuthorizedAction } from '@/app/[locale]/dashboard/authorized/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : 'إضافة'}
    </button>
  );
}

export function AuthorizedForm({ students }: { students: { id: string; name: string }[] }) {
  const [state, action] = useFormState(addAuthorizedAction, null as null | { ok?: boolean });
  if (students.length === 0) return null;
  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-2">
      <div>
        <label className="label">الطفل</label>
        <select name="student_id" className="input">
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">الاسم</label>
        <input name="name" className="input" required />
      </div>
      <div>
        <label className="label">الهاتف</label>
        <input name="phone" className="input" dir="ltr" />
      </div>
      <div>
        <label className="label">الصلة</label>
        <input name="relation" className="input" placeholder="سائق / قريب" />
      </div>
      <div className="sm:col-span-2">
        <Btn />
        {state?.ok && <span className="ms-2 text-xs text-green-vibrant">تمت الإضافة</span>}
      </div>
    </form>
  );
}
