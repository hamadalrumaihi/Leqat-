import { getLocale } from 'next-intl/server';
import { CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { effectiveRole, formatTime12, dualDate, qatarToday, qatarNowMinutes } from '@/lib/utils';

const STAFF = ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'];

function minutesToHHMM(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Supervisor home chip: the next station in today's session (prayer
// stations are part of the plan, flagged with is_prayer — no external
// prayer-time fetch). Falls back to the next upcoming session.
export async function NextEventWidget() {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(effectiveRole(user.role))) return null;

  const locale = (await getLocale()) as 'ar' | 'en';
  const pref = locale === 'ar' ? 'arabic' : 'latin';
  const supabase = await createClient();
  const todayStr = qatarToday();

  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, start_time, stations(order_index, title_ar, duration_min, is_prayer)')
    .gte('date', todayStr)
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!session) return null;

  const isToday = session.date === todayStr;
  const nowMin = qatarNowMinutes();

  // Next station today, derived from start_time + cumulative durations.
  let nextStation: { title: string; hhmm: string; isPrayer: boolean } | null = null;
  let upcoming: { title: string; hhmm: string; isPrayer: boolean }[] = [];
  if (isToday && session.start_time) {
    const [bh, bm] = (session.start_time as string).split(':').map(Number);
    let cursor = bh * 60 + bm;
    const stations = ((session.stations as Record<string, unknown>[]) ?? [])
      .slice()
      .sort((a, b) => (a.order_index as number) - (b.order_index as number));
    for (const st of stations) {
      const startMin = cursor;
      const item = {
        title: st.title_ar as string,
        hhmm: minutesToHHMM(startMin),
        isPrayer: Boolean(st.is_prayer),
      };
      if (startMin >= nowMin) {
        if (!nextStation) nextStation = item;
        else if (upcoming.length < 2) upcoming.push(item);
      }
      cursor += (st.duration_min as number) ?? 0;
    }
  }

  return (
    <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">الحدث التالي</p>
          {nextStation ? (
            <p className="font-semibold">
              {nextStation.isPrayer ? '🕌 ' : ''}
              {nextStation.title} · {formatTime12(nextStation.hhmm, pref)}
            </p>
          ) : (
            <p className="font-semibold">
              الجلسة القادمة · {dualDate(session.date as string, locale)}
              {session.start_time ? ` · ${formatTime12(session.start_time as string, pref)}` : ''}
            </p>
          )}
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {upcoming.map((u, i) => (
            <span
              key={i}
              className={`rounded-full px-3 py-1 ${
                u.isPrayer ? 'bg-green-vibrant/15 text-green-vibrant' : 'bg-muted text-muted-foreground'
              }`}
            >
              {u.isPrayer ? '🕌 ' : ''}
              {u.title} {formatTime12(u.hhmm, pref)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
