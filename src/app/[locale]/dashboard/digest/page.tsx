import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { dualDate, qatarToday } from '@/lib/utils';

export default async function DigestPage() {
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();
  const today = qatarToday();

  const [{ data: nextSession }, { data: lastReport }, { data: lastSession }] =
    await Promise.all([
      supabase
        .from('sessions')
        .select('id, date, week_no, stations(order_index, title_ar, duration_min)')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('reports')
        .select('summary_ar, highlights_ar, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('sessions')
        .select('id, date')
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  let attendance = { present: 0, total: 0 };
  if (lastSession) {
    const { data: att } = await supabase
      .from('attendance')
      .select('status')
      .eq('session_id', (lastSession as { id: string }).id);
    attendance.total = (att ?? []).length;
    attendance.present = (att ?? []).filter(
      (a) => a.status === 'present' || a.status === 'late',
    ).length;
  }

  const { data: media } = await supabase
    .from('gallery_media')
    .select('path, blurred')
    .eq('blurred', false)
    .order('created_at', { ascending: false })
    .limit(6);
  const signed = new Map<string, string>();
  const paths = (media ?? []).map((m) => m.path as string);
  if (paths.length > 0) {
    const { data } = await supabase.storage.from('gallery').createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.signedUrl && s.path) signed.set(s.path, s.signedUrl);
  }

  const stations = nextSession
    ? ((nextSession.stations as Record<string, unknown>[]) ?? [])
        .slice()
        .sort((a, b) => (a.order_index as number) - (b.order_index as number))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الملخص الأسبوعي — Weekly digest</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-2 font-semibold">حضور آخر جلسة</h2>
          {attendance.total === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <p className="text-3xl font-bold text-green-vibrant">
              {Math.round((attendance.present / attendance.total) * 100)}%
            </p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-2 font-semibold">آخر تقرير</h2>
          {lastReport ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {lastReport.summary_ar as string}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">صور هذا الأسبوع</h2>
        {paths.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد صور.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {(media ?? []).map((m, i) => {
              const url = signed.get(m.path as string);
              return url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-md object-cover"
                />
              ) : null;
            })}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">
          الجلسة القادمة{' '}
          {nextSession ? `· ${dualDate(nextSession.date as string, locale)}` : ''}
        </h2>
        {stations.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد جلسة قادمة مجدولة.</p>
        ) : (
          <ol className="space-y-2">
            {stations.map((st, i) => (
              <li key={i} className="flex justify-between rounded-md border bg-background p-3 text-sm">
                <span>
                  {i + 1}. {st.title_ar as string}
                </span>
                <span className="text-muted-foreground">{st.duration_min as number}د</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
