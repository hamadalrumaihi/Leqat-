'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateWorkbookProgressAction } from '@/app/[locale]/dashboard/books/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-outline h-9 px-3 text-xs" disabled={pending}>
      {pending ? '…' : 'تحديث الموضع'}
    </button>
  );
}

export function WorkbookProgress({
  groupId,
  bookId,
  page,
  section,
}: {
  groupId: string;
  bookId: string;
  page: number;
  section: string;
}) {
  const [state, action] = useFormState(updateWorkbookProgressAction, null as null | { ok?: boolean });
  return (
    <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="book_id" value={bookId} />
      <div className="w-20">
        <label className="label text-xs">الصفحة</label>
        <input name="current_page" type="number" min="0" defaultValue={page} className="input h-9" />
      </div>
      <div className="flex-1">
        <label className="label text-xs">آخر قسم</label>
        <input name="last_section" defaultValue={section} className="input h-9" />
      </div>
      <Btn />
      {state?.ok && <span className="text-xs text-green-vibrant">تم</span>}
    </form>
  );
}
