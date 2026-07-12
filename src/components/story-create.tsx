'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createStoryAction } from '@/app/[locale]/dashboard/stories/actions';
import { VISIBLE_AGE_GROUPS, AGE_LABEL_AR } from '@/lib/age-groups';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : 'إضافة قصة'}
    </button>
  );
}

export function StoryCreate() {
  const [, action] = useFormState(createStoryAction, null);
  return (
    <form action={action} className="card space-y-3 p-5">
      <div>
        <label className="label">عنوان القصة</label>
        <input name="title_ar" className="input" required />
      </div>
      <div>
        <label className="label">النص</label>
        <textarea name="body_ar" rows={3} className="input h-auto py-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">القيمة</label>
          <input name="value_ar" className="input" placeholder="الإحسان" />
        </div>
        <div>
          <label className="label">الفئة</label>
          <select name="age_grp" className="input">
            {VISIBLE_AGE_GROUPS.map((g) => (
              <option key={g} value={g}>{AGE_LABEL_AR[g]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">البُعد</label>
          <select name="quotient" className="input">
            <option value="SQ">SQ</option>
            <option value="EQ">EQ</option>
            <option value="IQ">IQ</option>
            <option value="PQ">PQ</option>
          </select>
        </div>
      </div>
      <Btn />
    </form>
  );
}
