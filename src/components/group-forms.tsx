'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createGroupAction, updateGroupAction } from '@/app/[locale]/dashboard/groups/actions';
import { BRAND_GREEN } from '@/lib/utils';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function CreateGroup({ programs }: { programs: { id: string; name_ar: string }[] }) {
  const [, action] = useFormState(createGroupAction, null);
  if (programs.length === 0) return null;
  return (
    <form action={action} className="card flex flex-wrap items-end gap-3 p-5">
      <div>
        <label className="label">البرنامج</label>
        <select name="program_id" className="input">
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name_ar}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="label">اسم المجموعة</label>
        <input name="name_ar" className="input" required />
      </div>
      <div>
        <label className="label">اللون</label>
        <input name="color" type="color" defaultValue={BRAND_GREEN} className="h-11 w-14 rounded-md border" />
      </div>
      <div className="w-24">
        <label className="label">السعة</label>
        <input name="capacity" type="number" min="1" defaultValue={15} className="input" />
      </div>
      <Submit label="إنشاء" />
    </form>
  );
}

export function EditGroup({
  group,
}: {
  group: { id: string; name_ar: string; color: string | null; capacity: number };
}) {
  const [, action] = useFormState(updateGroupAction, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="group_id" value={group.id} />
      <div className="flex-1">
        <label className="label">الاسم</label>
        <input name="name_ar" defaultValue={group.name_ar} className="input" />
      </div>
      <div>
        <label className="label">اللون</label>
        <input name="color" type="color" defaultValue={group.color || BRAND_GREEN} className="h-11 w-14 rounded-md border" />
      </div>
      <div className="w-24">
        <label className="label">السعة</label>
        <input name="capacity" type="number" min="1" defaultValue={group.capacity} className="input" />
      </div>
      <Submit label="حفظ" />
    </form>
  );
}
