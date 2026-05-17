'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signSlipAction } from '@/app/[locale]/dashboard/slips/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-9 px-4" disabled={pending}>
      {pending ? '…' : 'توقيع إلكتروني'}
    </button>
  );
}

export function SlipSign({
  slipId,
  kids,
}: {
  slipId: string;
  kids: { id: string; name: string; signed: boolean }[];
}) {
  const [state, action] = useFormState(signSlipAction, null as
    | null
    | { ok?: boolean; error?: string });

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      {kids.map((c) =>
        c.signed ? (
          <p key={c.id} className="text-sm text-green-vibrant">
            ✓ موقّع — {c.name}
          </p>
        ) : (
          <form key={c.id} action={action} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="slip_id" value={slipId} />
            <input type="hidden" name="student_id" value={c.id} />
            <div>
              <label className="label text-xs">توقيع ولي الأمر عن {c.name}</label>
              <input name="signed_name" className="input h-9" placeholder="الاسم الكامل" required />
            </div>
            <Btn />
          </form>
        ),
      )}
      {state?.error && (
        <p className="text-xs text-destructive">تعذّر التوقيع.</p>
      )}
    </div>
  );
}
