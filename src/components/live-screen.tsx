'use client';

import { useEffect, useState } from 'react';

type Station = {
  title: string;
  minutes: number;
  quotient?: string | null;
  secondary?: string[];
  repeat?: string | null;
  isPrayer?: boolean;
};

const Q_COLOR: Record<string, string> = {
  SQ: '#1F5C3A',
  EQ: '#3FA34D',
  IQ: '#8A8F98',
  PQ: '#A7D7A0',
};

export function LiveScreen({
  valueAr,
  stations,
  names,
}: {
  valueAr: string;
  stations: Station[];
  names: string[];
}) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [nameIdx, setNameIdx] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (names.length === 0) return;
    const id = setInterval(() => setNameIdx((i) => (i + 1) % names.length), 2500);
    return () => clearInterval(id);
  }, [names.length]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="min-h-[80vh] rounded-2xl bg-primary p-10 text-primary-foreground">
      <div className="text-center">
        <p className="text-sm opacity-80">قيمة اليوم</p>
        <p className="mt-1 text-5xl font-bold">{valueAr}</p>
        <p className="latin-term mt-4 text-xl tracking-widest opacity-90">
          R · E · P · E · A · T
        </p>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold opacity-80">المحطات</h2>
          <ol className="space-y-2">
            {stations.map((s, i) => (
              <li key={i} className="rounded-lg bg-white/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span>
                    {s.isPrayer ? '🕌 ' : ''}
                    {i + 1}. {s.title}
                  </span>
                  <span className="opacity-80">{s.minutes}د</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {s.quotient ? (
                    <span
                      className="latin-term rounded px-1.5 py-0.5 text-[11px] font-bold"
                      style={{ backgroundColor: Q_COLOR[s.quotient] ?? '#3FA34D', color: '#fff' }}
                    >
                      {s.quotient}
                    </span>
                  ) : null}
                  {(s.secondary ?? []).map((sq) => (
                    <span key={sq} className="latin-term rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
                      {sq}
                    </span>
                  ))}
                  {s.repeat ? (
                    <span className="latin-term rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {s.repeat}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-sm opacity-80">المؤقّت</p>
            <p className="font-mono text-7xl font-bold">
              {mm}:{ss}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                onClick={() => setRunning((r) => !r)}
                className="rounded-lg bg-white px-5 py-2 font-medium text-primary"
              >
                {running ? 'إيقاف' : 'بدء'}
              </button>
              <button
                onClick={() => {
                  setRunning(false);
                  setSeconds(0);
                }}
                className="rounded-lg bg-white/20 px-5 py-2"
              >
                تصفير
              </button>
            </div>
          </div>

          {names.length > 0 && (
            <div className="text-center">
              <p className="text-sm opacity-80">مشارك</p>
              <p className="text-3xl font-bold">{names[nameIdx]}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
