'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { redeemInviteAction } from '@/app/[locale]/(auth)/actions';
import { AGE_GROUPS, ageGroupFromDob, type AgeGroup } from '@/lib/age';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? '…' : 'تسجيل'}
    </button>
  );
}

function dateBound(yearsAgo: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - yearsAgo);
  return d.toISOString().slice(0, 10);
}

export function InviteRegisterForm({
  token,
  programName,
  phoneHint,
}: {
  token: string;
  programName: string;
  phoneHint: string | null;
}) {
  const [state, action] = useFormState(redeemInviteAction, null as null | { ok?: boolean; error?: string });
  const [age, setAge] = useState<AgeGroup>('nashia');
  const [contacts, setContacts] = useState([{ id: 1 }]);
  const [nextId, setNextId] = useState(2);

  if (state?.ok) {
    return (
      <div className="card space-y-4 p-8 text-center">
        <p className="text-xl font-bold text-green-vibrant">تم التسجيل بنجاح</p>
        <p className="text-sm text-muted-foreground">
          سيتم إرسال رابط الدخول إلى بريدك الإلكتروني.
        </p>
        <a href="/" className="btn-outline inline-flex">العودة</a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="token" value={token} />

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">معلومات ولي الأمر</h2>
        <div>
          <label className="label">الاسم الكامل</label>
          <input name="parent_name" className="input" required />
        </div>
        <div>
          <label className="label">البريد الإلكتروني (لرابط الدخول)</label>
          <input name="parent_email" type="email" dir="ltr" className="input" required />
        </div>
        <div>
          <label className="label">رقم الواتساب</label>
          <input name="parent_phone" dir="ltr" defaultValue={phoneHint ?? ''} className="input" required />
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">معلومات الطفل</h2>
        <div>
          <label className="label">الاسم الكامل</label>
          <input name="child_name" className="input" required />
        </div>
        <div>
          <label className="label">تاريخ الميلاد</label>
          <input
            name="child_dob"
            type="date"
            dir="ltr"
            min={dateBound(18)}
            max={dateBound(5)}
            className="input"
            required
            onChange={(e) => e.target.value && setAge(ageGroupFromDob(e.target.value))}
          />
        </div>
        <div>
          <label className="label">الفئة العمرية</label>
          <select name="child_age_group" value={age} onChange={(e) => setAge(e.target.value as AgeGroup)} className="input">
            {AGE_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>{g.ar}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">الرسوم المتفق عليها (اختياري)</label>
          <input name="price_note" className="input" placeholder="مثال: ١٥٠٠ ر.ق على دفعتين" />
          <p className="mt-1 text-xs text-muted-foreground">
            الرسوم قد تختلف حسب الحجز — اكتبها كما اتُّفق عليها.
          </p>
        </div>
        <div>
          <label className="label">ملاحظات طبية (اختياري)</label>
          <textarea name="medical_notes" rows={2} className="input h-auto py-2" />
        </div>

        <div>
          <label className="label">جهات الاتصال للطوارئ (اختياري)</label>
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <div key={c.id} className="grid grid-cols-3 gap-2">
                <input name="ec_name" placeholder="الاسم" className="input h-9" />
                <input name="ec_phone" placeholder="الهاتف" dir="ltr" className="input h-9" />
                <input name="ec_relation" placeholder="الصلة" className="input h-9" />
                {i === contacts.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setContacts((p) => [...p, { id: nextId }]);
                      setNextId((n) => n + 1);
                    }}
                    className="btn-ghost col-span-3 h-8 text-xs"
                  >
                    + إضافة جهة اتصال
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">الموافقات</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="photo_consent" defaultChecked />
          أوافق على نشر صور طفلي في معرض المجموعة (يمكن سحب الموافقة لاحقًا)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="policy_agree" required />
          قرأت ووافقت على{' '}
          <a href="/ar/policy" className="text-primary underline">لائحة البرنامج</a>
        </label>
      </section>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>
      )}

      <p className="text-center text-sm font-medium text-primary">تسجيل في {programName}</p>
      <Submit />
    </form>
  );
}
