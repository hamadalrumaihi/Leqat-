'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  createAlbumAction,
  generateHighlightsAction,
} from '@/app/[locale]/dashboard/gallery/actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function GalleryAdmin({
  groups,
}: {
  groups: { id: string; name_ar: string }[];
}) {
  const [, createAction] = useFormState(createAlbumAction, null);
  const [, highlightsAction] = useFormState(generateHighlightsAction, null);

  if (groups.length === 0) return null;

  return (
    <div className="card space-y-4 p-5">
      <form action={createAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">المجموعة</label>
          <select name="group_id" className="input">
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name_ar}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">عنوان الألبوم</label>
          <input name="title_ar" className="input" required placeholder="مثال: الأسبوع الثالث" />
        </div>
        <Submit label="إنشاء ألبوم" />
      </form>

      <form action={highlightsAction} className="flex items-end gap-3 border-t pt-4">
        <div>
          <label className="label">مجموعة لأبرز لحظات نهاية العام</label>
          <select name="group_id" className="input">
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name_ar}
              </option>
            ))}
          </select>
        </div>
        <Submit label="توليد ألبوم الأبرز" />
      </form>
    </div>
  );
}
