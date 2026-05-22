'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { updateParentPhone } from '@/app/[locale]/dashboard/groups/[id]/actions';

type Item = { studentId: string; name: string; parentId: string | null };

function Fix({ parentId }: { parentId: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs text-green-vibrant">تم</span>;
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline h-8 px-3 text-xs">
        تحديث
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        dir="ltr"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="رقم ولي الأمر"
        className="input h-8 w-32 text-xs"
      />
      <button
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          const res = await updateParentPhone(parentId, phone);
          setSaving(false);
          if (!('error' in res)) setDone(true);
        }}
        className="btn-primary h-8 px-2 text-xs"
      >
        حفظ
      </button>
    </span>
  );
}

export function MissingPhoneAlerts({ items, total }: { items: Item[]; total: number }) {
  if (total === 0) return null;
  return (
    <div className="card border-amber-300 p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-amber-700">
        <AlertTriangle className="h-4 w-4" /> تنبيهات — أرقام أولياء أمور غير مسجّلة ({total})
      </h2>
      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.studentId} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm">{it.name}</span>
            {it.parentId ? <Fix parentId={it.parentId} /> : null}
          </li>
        ))}
      </ul>
      {total > items.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          و{total - items.length} آخرون — افتح «مجموعتي» لعرض الكل.
        </p>
      )}
    </div>
  );
}
