'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createProgramAction, updateProgramAction } from '@/app/[locale]/dashboard/programs/actions';
import { QUOTIENT_VALUE, quotientLabel } from '@/lib/utils';
import { VISIBLE_AGE_GROUPS, AGE_LABEL_AR, type AgeGroup } from '@/lib/age-groups';

const QUOTIENTS = ['SQ', 'EQ', 'IQ', 'PQ'] as const;

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

// A program can target one or both age categories.
function AgeGroupsPicker({ defaults }: { defaults: AgeGroup[] }) {
  return (
    <div>
      <span className="label">الفئات العمرية</span>
      <div className="flex flex-wrap gap-4 pt-2">
        {VISIBLE_AGE_GROUPS.map((g) => (
          <label key={g} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="age_grps" value={g} defaultChecked={defaults.includes(g)} />
            {AGE_LABEL_AR[g]}
          </label>
        ))}
      </div>
    </div>
  );
}

// Shared quotient → value block. Picking a quotient fills the value
// fields (editable); mirrors the DB trigger so the planner sees it live.
function QuotientValue({
  quotient,
  valueAr,
  valueEn,
}: {
  quotient: string;
  valueAr: string;
  valueEn: string;
}) {
  const [q, setQ] = useState(quotient);
  const [ar, setAr] = useState(valueAr);
  const [en, setEn] = useState(valueEn);
  const [auto, setAuto] = useState(false);

  return (
    <>
      <div>
        <label className="label">البعد</label>
        <select
          name="quotient"
          value={q}
          onChange={(e) => {
            const nq = e.target.value;
            setQ(nq);
            if (nq && (!ar || auto)) {
              setAr(QUOTIENT_VALUE[nq]?.ar ?? '');
              setEn(QUOTIENT_VALUE[nq]?.en ?? '');
              setAuto(true);
            }
          }}
          className="input"
        >
          <option value="">—</option>
          {QUOTIENTS.map((x) => (
            <option key={x} value={x}>{quotientLabel(x)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">القيمة (عربي)</label>
        <input name="value_ar" value={ar} onChange={(e) => { setAr(e.target.value); setAuto(false); }} className="input" />
      </div>
      <div>
        <label className="label">Value (EN)</label>
        <input name="value_en" value={en} onChange={(e) => { setEn(e.target.value); setAuto(false); }} className="input" dir="ltr" />
      </div>
      {auto && (
        <p className="text-xs text-muted-foreground sm:col-span-3">
          تعبئة تلقائية — يمكن التعديل
        </p>
      )}
    </>
  );
}

export function CreateProgram() {
  const [, action] = useFormState(createProgramAction, null);
  return (
    <form action={action} className="card grid gap-3 p-5 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <label className="label">اسم البرنامج (عربي)</label>
        <input name="name_ar" className="input" required />
      </div>
      <div>
        <label className="label">النوع</label>
        <select name="type" className="input">
          <option value="weekly">أسبوعي</option>
          <option value="daily">يومي</option>
        </select>
      </div>
      <div className="sm:col-span-3">
        <AgeGroupsPicker defaults={[...VISIBLE_AGE_GROUPS]} />
      </div>
      <QuotientValue quotient="" valueAr="" valueEn="" />
      <div>
        <label className="label">الأسابيع</label>
        <input name="weeks" type="number" min="1" defaultValue={10} className="input" />
      </div>
      <div>
        <label className="label">السعة</label>
        <input name="capacity" type="number" min="1" defaultValue={15} className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="ramadan_mode" /> وضع رمضان (جلسات أقصر، صلاة بدل الوجبة)
      </label>
      <p className="text-xs text-muted-foreground sm:col-span-3">
        الرسوم تُتّفق عليها عند الحجز وتُكتب نصًا حرًا أثناء تسجيل الطالب.
      </p>
      <div className="sm:col-span-3">
        <Btn label="إنشاء برنامج" />
      </div>
    </form>
  );
}

export function EditProgram({
  program,
}: {
  program: {
    id: string;
    name_ar: string;
    age_grps: AgeGroup[];
    quotient: string;
    value_ar: string;
    value_en: string;
    ramadan_mode: boolean;
    status: string;
  };
}) {
  const [, action] = useFormState(updateProgramAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="program_id" value={program.id} />
      <div className="sm:col-span-2">
        <label className="label">اسم البرنامج (عربي)</label>
        <input name="name_ar" defaultValue={program.name_ar} className="input" required />
      </div>
      <div>
        <label className="label">الحالة</label>
        <select name="status" defaultValue={program.status} className="input">
          <option value="draft">مسودة</option>
          <option value="open">مفتوح للتسجيل</option>
          <option value="closed">مغلق</option>
          <option value="archived">مؤرشف</option>
        </select>
      </div>
      <div className="sm:col-span-3">
        <AgeGroupsPicker defaults={program.age_grps} />
      </div>
      <QuotientValue quotient={program.quotient} valueAr={program.value_ar} valueEn={program.value_en} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="ramadan_mode" defaultChecked={program.ramadan_mode} /> وضع رمضان
      </label>
      <div className="sm:col-span-3">
        <Btn label="حفظ" />
      </div>
    </form>
  );
}
