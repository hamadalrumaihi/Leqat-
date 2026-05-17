'use client';

import { useFormStatus } from 'react-dom';
import {
  addItemAction,
  checkoutItemAction,
  returnCheckoutAction,
} from '@/app/[locale]/dashboard/inventory/actions';

function S({ label, sm }: { label: string; sm?: boolean }) {
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

export function AddItem() {
  return (
    <form action={addItemAction} className="card flex flex-wrap items-end gap-3 p-5">
      <div className="flex-1">
        <label className="label">اسم العنصر</label>
        <input name="name_ar" className="input" required />
      </div>
      <div className="w-28">
        <label className="label">الكمية</label>
        <input name="total_qty" type="number" min="0" className="input" defaultValue={1} />
      </div>
      <S label="إضافة" />
    </form>
  );
}

export function Checkout({ itemId }: { itemId: string }) {
  return (
    <form action={checkoutItemAction} className="flex items-center gap-2">
      <input type="hidden" name="item_id" value={itemId} />
      <input
        name="qty"
        type="number"
        min="1"
        defaultValue={1}
        className="input h-9 w-16"
        aria-label="qty"
      />
      <S label="إخراج" sm />
    </form>
  );
}

export function ReturnBtn({ checkoutId }: { checkoutId: string }) {
  return (
    <form action={returnCheckoutAction}>
      <input type="hidden" name="checkout_id" value={checkoutId} />
      <S label="إرجاع" sm />
    </form>
  );
}
