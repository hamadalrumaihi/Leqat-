'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ParentContact } from '@/components/parent-contact';

type Row = {
  id: string;
  nameAr: string;
  nameEn: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  status: string | null;
};
const CYCLE = ['present', 'absent', 'late', 'excused'] as const;
type Status = (typeof CYCLE)[number];

const COLOR: Record<Status, string> = {
  present: 'bg-green-vibrant text-white',
  absent: 'bg-destructive text-white',
  late: 'bg-amber-500 text-white',
  excused: 'bg-formation text-white',
};

const QUEUE_KEY = 'leqat:attendance:queue';

export function AttendanceList({
  sessionId,
  roster,
}: {
  sessionId: string;
  roster: Row[];
}) {
  const t = useTranslations('attendance');
  const locale = useLocale();
  const [rows, setRows] = useState<Row[]>(roster);
  const [online, setOnline] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  // Flush any queued offline marks when back online.
  useEffect(() => {
    if (!online) return;
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const queued = JSON.parse(raw) as { sessionId: string; studentId: string; status: string }[];
    if (queued.length === 0) return;
    const supabase = createClient();
    supabase
      .from('attendance')
      .upsert(
        queued.map((q) => ({
          session_id: q.sessionId,
          student_id: q.studentId,
          status: q.status,
        })),
        { onConflict: 'session_id,student_id' },
      )
      .then(() => localStorage.removeItem(QUEUE_KEY));
  }, [online]);

  function cycle(id: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const idx = r.status ? CYCLE.indexOf(r.status as Status) : -1;
        const next = CYCLE[(idx + 1) % CYCLE.length];
        persist(id, next);
        return { ...r, status: next };
      }),
    );
  }

  function persist(studentId: string, status: string) {
    if (!navigator.onLine) {
      const raw = localStorage.getItem(QUEUE_KEY);
      const q = raw ? JSON.parse(raw) : [];
      localStorage.setItem(
        QUEUE_KEY,
        JSON.stringify([...q.filter((x: { studentId: string }) => x.studentId !== studentId), { sessionId, studentId, status }]),
      );
      return;
    }
    const supabase = createClient();
    supabase
      .from('attendance')
      .upsert(
        { session_id: sessionId, student_id: studentId, status },
        { onConflict: 'session_id,student_id' },
      )
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('tapHint')}</span>
        {!online && <span className="text-amber-600">{t('offline')}</span>}
        {online && saved && <span className="text-green-vibrant">{t('saved')}</span>}
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-medium">
                {locale === 'ar' ? r.nameAr : r.nameEn || r.nameAr}
              </span>
              {r.parentName && <ParentContact name={r.parentName} phone={r.parentPhone ?? null} />}
            </div>
            <button
              onClick={() => cycle(r.id)}
              aria-label={t('tapHint')}
              className={cn(
                'min-h-11 min-w-[4.5rem] shrink-0 rounded-full px-4 text-sm font-semibold active:scale-95',
                r.status ? COLOR[r.status as Status] : 'bg-muted text-muted-foreground',
              )}
            >
              {r.status ? t(r.status as Status) : '—'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
