'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { awardRecognitionAction } from '@/app/[locale]/dashboard/recognition/actions';

const VALUES = ['الإحسان', 'الانضباط الذاتي', 'التعلّم', 'الصحة', 'التعاون', 'القيادة'];

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : 'منح تحفيز'}
    </button>
  );
}

export function RecognitionForm({
  students,
}: {
  students: { id: string; name: string }[];
}) {
  const [state, action] = useFormState(awardRecognitionAction, null as
    | null
    | { ok?: boolean; error?: string });

  return (
    <form action={action} className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">الطالب</label>
          <select name="student_id" className="input" required>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">القيمة</label>
          <select name="value_ar" className="input">
            {VALUES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">ملاحظة (اختياري)</label>
        <input name="note_ar" className="input" placeholder="سبب التحفيز" />
      </div>
      {state?.ok && (
        <p className="text-sm text-green-vibrant">تم المنح — يظهر على جدار الطفل.</p>
      )}
      <Btn />
    </form>
  );
}
