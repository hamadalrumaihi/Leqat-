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
