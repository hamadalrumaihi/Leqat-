import { getLocale } from 'next-intl/server';
import { CalendarClock, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { effectiveRole, formatTime12, dualDate } from '@/lib/utils';
import { getDohaPrayerTimes, nextPrayerAfter } from '@/lib/prayer';

const STAFF = ['executive', 'program_planner', 'group_supervisor', 'assistant_supervisor'];

function minutesToHHMM(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Supervisor home chip: the next station start AND the next prayer,
// highlighting whichever comes sooner. Degrades gracefully when the
// prayer API is unreachable.
export async function NextEventWidget() {
  const user = await getCurrentUser();
  if (!user || !STAFF.includes(effectiveRole(user.role))) return null;

  const locale = (await getLocale()) as 'ar' | 'en';
  const pref = locale === 'ar' ? 'arabic' : 'latin';
  const supabase = await createClient();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, start_time, stations(order_index, title_ar, duration_min)')
    .gte('date', todayStr)
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle();

  const prayer = await getDohaPrayerTimes(now);
  const nextPrayer = nextPrayerAfter(prayer, now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Next station today (derived from session start + cumulative durations).
  let nextStation: { title: string; hhmm: string; minutes: number } | null = null;
  const isToday = session?.date === todayStr;
  if (session && isToday && session.start_time) {
    const base = (() => {
      const [h, m] = (session.start_time as string).split(':').map(Number);
      return h * 60 + m;
    })();
    const stations = ((session.stations as Record<string, unknown>[]) ?? [])
      .slice()
      .sort((a, b) => (a.order_index as number) - (b.order_index as number));
    let offset = 0;
    for (const st of stations) {
      const startMin = base + offset;
      if (startMin >= nowMin) {
        nextStation = {
          title: st.title_ar as string,
          hhmm: minutesToHHMM(startMin),
          minutes: startMin,
        };
        break;
      }
      offset += (st.duration_min as number) ?? 0;
    }
  }

  if (!nextStation && !nextPrayer && !session) return null;

  // Which is sooner (only meaningful when both are today).
  const soonerIsPrayer =
    nextStation && nextPrayer ? nextPrayer.minutes < nextStation.minutes : Boolean(nextPrayer);

  return (
    <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">الحدث التالي</p>
          {nextStation || nextPrayer ? (
            <p className="font-semibold">
              {soonerIsPrayer && nextPrayer
                ? `صلاة ${nextPrayer.ar} · ${formatTime12(nextPrayer.hhmm, pref)}`
                : nextStation
                  ? `${nextStation.title} · ${formatTime12(nextStation.hhmm, pref)}`
                  : nextPrayer
                    ? `صلاة ${nextPrayer.ar} · ${formatTime12(nextPrayer.hhmm, pref)}`
                    : ''}
            </p>
          ) : (
            <p className="font-semibold">
              الجلسة القادمة · {session ? dualDate(session.date as string, locale) : ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {nextStation && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            المحطة: {nextStation.title} {formatTime12(nextStation.hhmm, pref)}
          </span>
        )}
        {nextPrayer && (
          <span className="rounded-full bg-green-vibrant/15 px-3 py-1 text-green-vibrant">
            <Sparkles className="me-1 inline h-3 w-3" />
            صلاة {nextPrayer.ar} {formatTime12(nextPrayer.hhmm, pref)}
          </span>
        )}
        {!isToday && session && (
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
            الجلسة: {dualDate(session.date as string, locale)}
            {session.start_time ? ` ${formatTime12(session.start_time as string, pref)}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
