'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { registerChildAction } from '@/app/[locale]/dashboard/payments/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? '…' : 'تسجيل ومتابعة الدفع'}
    </button>
  );
}

export function RegisterChildForm({
  programs,
}: {
  programs: { id: string; name_ar: string; price_qar: number }[];
}) {
  const [state, action] = useFormState(registerChildAction, null as
    | null
    | { ok?: boolean; error?: string; waitlisted?: boolean });

  if (state?.ok) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold text-green-vibrant">
          {state.waitlisted ? 'تم التسجيل في قائمة الانتظار' : 'تم التسجيل'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          أكمل الدفع من صفحة «المدفوعات والتسجيل».
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">اسم الطفل (عربي)</label>
          <input name="full_name_ar" className="input" required />
        </div>
        <div>
          <label className="label">Name (English)</label>
          <input name="full_name_en" className="input" dir="ltr" />
        </div>
        <div>
          <label className="label">تاريخ الميلاد</label>
          <input name="dob" type="date" className="input" dir="ltr" />
        </div>
        <div>
          <label className="label">الفئة العمرية</label>
          <select name="age_grp" className="input">
            <option value="baraem">براعم (٥–٦)</option>
            <option value="nashia">ناشئة (٧–٩)</option>
            <option value="fityan">فتيان (١٠–١٤)</option>
            <option value="shabab">شباب (١٥–١٨)</option>
          </select>
        </div>
        <div>
          <label className="label">الجنس</label>
          <select name="gender" className="input">
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </div>
        <div>
          <label className="label">البرنامج</label>
          <select name="program_id" className="input" required>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_ar} — {p.price_qar} ر.ق
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">الباقة</label>
          <select name="tier" className="input">
            <option value="full_semester">الفصل كامل</option>
            <option value="per_session">بالجلسة</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">ملاحظات طبية / حساسية</label>
        <textarea name="medical" rows={2} className="input h-auto py-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">جهة طوارئ — الاسم</label>
          <input name="emergency_name" className="input" required />
        </div>
        <div>
          <label className="label">جهة طوارئ — الهاتف</label>
          <input name="emergency_phone" className="input" dir="ltr" required />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="medical_form" /> أقر بصحة النموذج الطبي وجهات
        الطوارئ (إلزامي)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="photo_consent" /> أوافق على ظهور صور طفلي في
        المنشورات الجماعية (اختياري — الافتراضي لا)
      </label>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error === 'missing_required'
            ? 'النموذج الطبي وجهة الطوارئ إلزاميان.'
            : 'تعذّر إتمام التسجيل.'}
        </p>
      )}

      <Submit />
    </form>
  );
}
