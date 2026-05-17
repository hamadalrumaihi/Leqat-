'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { payAction } from '@/app/[locale]/dashboard/payments/actions';

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-9 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function PayButton({ paymentId, label }: { paymentId: string; label: string }) {
  const [state, action] = useFormState(payAction, null as
    | null
    | { ok?: boolean; error?: string; redirect?: string; invoiceNo?: string });

  if (state?.redirect) {
    if (typeof window !== 'undefined') window.location.href = state.redirect;
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="payment_id" value={paymentId} />
      <Btn label={label} />
      {state?.error && <span className="text-xs text-destructive">{state.error}</span>}
      {state?.ok && <span className="text-xs text-green-vibrant">تم الدفع</span>}
    </form>
  );
}
