import { createClient } from '@/lib/supabase/server';
import { LiveScreen } from '@/components/live-screen';

export default async function LivePage() {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from('sessions')
    .select('id, group_id, programs(value_ar), stations(order_index, title_ar, duration_min, value_ar)')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return <div className="card p-8 text-center text-muted-foreground">لا توجد جلسة.</div>;
  }

  const stations = ((session.stations as Record<string, unknown>[]) ?? [])
    .slice()
    .sort((a, b) => (a.order_index as number) - (b.order_index as number))
    .map((s) => ({
      title: s.title_ar as string,
      minutes: s.duration_min as number,
    }));

  const valueAr =
    (session.programs as unknown as { value_ar: string } | null)?.value_ar ?? 'الإحسان';

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('students(full_name_ar)')
    .eq('group_id', session.group_id)
    .eq('status', 'active')
    .limit(50);

  const names = (enrollments ?? [])
    .map((e) => (e.students as unknown as { full_name_ar: string } | null)?.full_name_ar)
    .filter((n): n is string => Boolean(n));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">شاشة الجلسة — Live session</h1>
      <p className="text-sm text-muted-foreground">
        اعرض هذه الشاشة على التلفاز أثناء الطابور.
      </p>
      <LiveScreen valueAr={valueAr} stations={stations} names={names} />
    </div>
  );
}
