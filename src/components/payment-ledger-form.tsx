'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addPaymentAction } from '@/app/[locale]/dashboard/payments/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : 'تأكيد الدفع'}
    </button>
  );
}

export function PaymentLedgerForm({ parents }: { parents: { id: string; name: string }[] }) {
  const [state, action] = useFormState(addPaymentAction, null as null | { ok?: boolean });
  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="label">ولي الأمر</label>
        <select name="parent_id" className="input" required>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">المبلغ (ر.ق)</label>
        <input name="amount" type="number" min="0" step="0.01" className="input" required />
      </div>
      <div>
        <label className="label">رقم الفاتورة</label>
        <input name="invoice_no" className="input" />
      </div>
      <div>
        <label className="label">ملاحظة</label>
        <input name="note" className="input" defaultValue="تحويل بنكي، الإيصال على واتساب" />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Btn />
        {state?.ok && <span className="ms-2 text-xs text-green-vibrant">تم التأكيد</span>}
      </div>
    </form>
  );
}
