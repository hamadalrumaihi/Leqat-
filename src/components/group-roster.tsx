'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { GroupSwatch } from '@/components/group-swatch';
import { ParentContact } from '@/components/parent-contact';
import {
  searchUnassignedStudents,
  addStudentToGroup,
  removeStudentFromGroup,
  updateParentPhone,
} from '@/app/[locale]/dashboard/groups/[id]/actions';
import type { RosterStudent } from '@/lib/roster';

import { AGE_LABEL_AR, type AgeGroup } from '@/lib/age-groups';

function AgeBadge({ age }: { age: string | null }) {
  if (!age) return null;
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {AGE_LABEL_AR[age as AgeGroup] ?? age}
    </span>
  );
}

function PhoneFix({ parentId }: { parentId: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-primary underline">
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
          await updateParentPhone(parentId, phone);
          setSaving(false);
          setOpen(false);
        }}
        className="btn-primary h-8 px-2 text-xs"
      >
        حفظ
      </button>
    </span>
  );
}

export function GroupRoster({
  groupId,
  groupColor,
  initial,
}: {
  groupId: string;
  groupColor: string | null;
  initial: RosterStudent[];
}) {
  const [roster, setRoster] = useState<RosterStudent[]>(initial);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [results, setResults] = useState<RosterStudent[]>([]);
  const [searching, setSearching] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const toastId = useRef(0);

  function toast(text: string) {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }

  // Debounced search on 2+ chars.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const rosterIds = new Set(roster.map((r) => r.enrollmentId));
        const found = await searchUnassignedStudents(groupId, query, showAll);
        setResults(found.filter((f) => !rosterIds.has(f.enrollmentId)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, showAll, groupId, roster]);

  async function add(s: RosterStudent) {
    setResults((r) => r.filter((x) => x.enrollmentId !== s.enrollmentId));
    setRoster((r) => [s, ...r]);
    await addStudentToGroup(s.enrollmentId, groupId);
    toast(`تمت إضافة ${s.nameAr} للمجموعة`);
    if (!s.parentPhone) toast('تذكير: رقم ولي الأمر غير مسجّل');
  }

  async function remove(s: RosterStudent) {
    setRoster((r) => r.filter((x) => x.enrollmentId !== s.enrollmentId));
    await removeStudentFromGroup(s.enrollmentId, groupId);
    toast(`تمت إزالة ${s.nameAr} من المجموعة`);
  }

  return (
    <div className="space-y-6">
      {/* Current roster */}
      <section>
        <h2 className="mb-2 font-semibold">الكشف الحالي ({roster.length})</h2>
        {roster.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted-foreground">
            لا يوجد طلاب في المجموعة بعد — ابحث وأضِف من الأسفل.
          </div>
        ) : (
          <ul className="card divide-y">
            {roster.map((s) => (
              <li key={s.enrollmentId} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <GroupSwatch color={groupColor} />
                  <span className="font-medium">{s.nameAr}</span>
                  <AgeBadge age={s.ageGrp} />
                  {s.parentName && <ParentContact name={s.parentName} phone={s.parentPhone} />}
                  {!s.parentPhone && s.parentId && <PhoneFix parentId={s.parentId} />}
                </div>
                <button
                  onClick={() => remove(s)}
                  className="btn-ghost h-8 w-8 shrink-0 text-destructive"
                  aria-label="إزالة من المجموعة"
                  title="إزالة من المجموعة / Remove from group"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add students */}
      <section>
        <h2 className="mb-2 font-semibold">إضافة طلاب</h2>
        <div className="card space-y-3 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن الطالب بالاسم"
            className="input"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            إظهار كل الأعمار
          </label>

          {searching && <p className="text-xs text-muted-foreground">جارٍ البحث…</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground">لا نتائج مطابقة غير مُسندة.</p>
          )}

          <ul className="divide-y">
            {results.map((s) => (
              <li key={s.enrollmentId} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium">{s.nameAr}</span>
                  <AgeBadge age={s.ageGrp} />
                  {s.dob && (
                    <span className="latin-term text-xs text-muted-foreground">{s.dob}</span>
                  )}
                  {s.parentName && (
                    <span className="text-xs text-muted-foreground">{s.parentName}</span>
                  )}
                  {!s.parentPhone && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 dark:bg-red-950 dark:text-red-300">
                      رقم الأهل مفقود
                    </span>
                  )}
                </div>
                <button onClick={() => add(s)} className="btn-primary h-9 shrink-0 gap-1.5 px-3 text-sm">
                  <UserPlus className="h-4 w-4" /> إضافة للمجموعة
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 start-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
