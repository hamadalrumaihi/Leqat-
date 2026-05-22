// Prayer-aware scheduling helper. Uses the AlAdhan API for Doha.
// Network-tolerant: returns null on failure so callers degrade
// gracefully (scheduling simply skips the prayer-pause hints).

export type PrayerTimes = {
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Fajr: string;
};

export async function getDohaPrayerTimes(
  date = new Date(),
): Promise<PrayerTimes | null> {
  try {
    const d = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const res = await fetch(
      `https://api.aladhan.com/v1/timingsByCity/${d}?city=Doha&country=Qatar&method=4`,
      { next: { revalidate: 43200 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { timings?: PrayerTimes } };
    return json.data?.timings ?? null;
  } catch {
    return null;
  }
}

export const PRAYER_AR: Record<string, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

const toMin = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/** The next prayer at or after `now` today, or null if all have passed. */
export function nextPrayerAfter(
  times: PrayerTimes | null,
  now: Date,
): { name: string; ar: string; hhmm: string; minutes: number } | null {
  if (!times) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
  for (const k of order) {
    const v = times[k];
    if (v && toMin(v) >= cur) {
      return { name: k, ar: PRAYER_AR[k], hhmm: v.slice(0, 5), minutes: toMin(v) };
    }
  }
  return null;
}

/** True if a session window overlaps a prayer time (HH:mm strings). */
export function overlapsPrayer(
  startHHmm: string,
  endHHmm: string,
  times: PrayerTimes | null,
): string[] {
  if (!times) return [];
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const s = toMin(startHHmm);
  const e = toMin(endHHmm);
  return Object.entries(times)
    .filter(([, v]) => {
      const p = toMin(v);
      return p >= s && p <= e;
    })
    .map(([k]) => k);
}
