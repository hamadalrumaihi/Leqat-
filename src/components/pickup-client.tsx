'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { arriveAction, releaseAction } from '@/app/[locale]/dashboard/pickup/actions';

type Authorized = { name: string; phone: string | null };

export function PickupParent({
  sessionId,
  kids,
  authorized,
}: {
  sessionId: string;
  kids: { id: string; name: string }[];
  authorized: Authorized[];
}) {
  const [studentId, setStudentId] = useState(kids[0]?.id ?? '');
  const [mode, setMode] = useState('self');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting' | 'released'>('idle');
  const supabase = useRef(createClient());

  useEffect(() => {
    if (status !== 'waiting') return;
    const sb = supabase.current;
    const ch = sb
      .channel(`pickup:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pickup_status', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          if (r.student_id === studentId && r.released_at) setStatus('released');
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [status, sessionId, studentId]);

  async function submit() {
    const fd = new FormData();
    fd.set('session_id', sessionId);
    fd.set('student_id', studentId);
    fd.set('mode', mode);
    if (mode === 'driver' || mode === 'other') {
      fd.set('person_name', name);
      fd.set('person_phone', phone);
    }
    setStatus('waiting');
    await arriveAction(null, fd);
  }

  if (status === 'released') {
    return (
      <div className="card p-8 text-center">
        <p className="text-2xl font-bold text-green-vibrant">تم تسليم الطفل</p>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div className="card flex items-center justify-center gap-3 p-8">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-lg">في الانتظار…</span>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-6">
      {kids.length > 1 && (
        <div>
          <label className="label">الطفل</label>
          <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {kids.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">من سيستلم الطفل؟</label>
        <select
          className="input"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            const a = authorized.find((x) => x.name === e.target.value);
            if (a) {
              setName(a.name);
              setPhone(a.phone ?? '');
            }
          }}
        >
          <option value="self">أنا</option>
          {authorized.map((a) => (
            <option key={a.name} value={a.name}>{a.name}</option>
          ))}
          <option value="other">شخص آخر — أدخل الاسم</option>
        </select>
      </div>
      {mode === 'other' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="الهاتف" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      )}
      <button onClick={submit} className="btn-primary h-14 w-full text-lg">
        أنا عند البوابة
      </button>
    </div>
  );
}

type Row = {
  id: string;
  studentName: string;
  person: string;
  arrivedAt: string;
};

export function PickupQueue({ sessionId, initial }: { sessionId: string; initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const supabase = useRef(createClient());

  useEffect(() => {
    const sb = supabase.current;
    const ch = sb
      .channel(`pickupq:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_status', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          if (!r?.id) return;
          if (r.released_at) {
            setRows((prev) => prev.filter((x) => x.id !== r.id));
          } else if (r.arrived_at) {
            setRows((prev) =>
              prev.some((x) => x.id === r.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: r.id as string,
                      studentName: '…',
                      person: (r.picked_up_by_name as string) || 'ولي الأمر',
                      arrivedAt: r.arrived_at as string,
                    },
                  ],
            );
          }
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [sessionId]);

  async function release(id: string) {
    const fd = new FormData();
    fd.set('pickup_id', id);
    setRows((prev) => prev.filter((x) => x.id !== id));
    await releaseAction(null, fd);
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 font-semibold">أولياء الأمور عند البوابة</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا أحد في الانتظار.</p>
      ) : (
        <ul className="divide-y">
          {rows
            .slice()
            .sort((a, b) => (a.arrivedAt < b.arrivedAt ? -1 : 1))
            .map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{r.studentName}</p>
                  <p className="text-xs text-muted-foreground">يستلمه: {r.person}</p>
                </div>
                <button onClick={() => release(r.id)} className="btn-primary h-9 px-4">
                  تم التسليم
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
