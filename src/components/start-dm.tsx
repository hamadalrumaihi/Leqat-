'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from '@/i18n/routing';
import { createDmAction } from '@/app/[locale]/dashboard/dm/actions';
import { useEffect } from 'react';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : 'بدء محادثة'}
    </button>
  );
}

export function StartDm({
  students,
}: {
  students: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action] = useFormState(createDmAction, null as
    | null
    | { channelId?: string; error?: string });

  useEffect(() => {
    if (state?.channelId) router.push(`/dashboard/dm?c=${state.channelId}`);
  }, [state, router]);

  if (students.length === 0) return null;

  return (
    <form action={action} className="card flex flex-wrap items-end gap-3 p-5">
      <div className="flex-1">
        <label className="label">طالب</label>
        <select name="student_id" className="input" required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <Btn />
      <p className="w-full text-xs text-muted-foreground">
        قاعدة البالغَين: تُضاف تلقائيًا نسخة لمشرف ثانٍ من نفس المجموعة.
      </p>
    </form>
  );
}
