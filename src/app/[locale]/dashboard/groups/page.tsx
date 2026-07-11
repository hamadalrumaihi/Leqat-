import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/routing';
import { GroupSwatch } from '@/components/group-swatch';
import { CreateGroup, EditGroup } from '@/components/group-forms';
import { RECOMMENDED_GROUP_SIZE, DIVISION_LABELS } from '@/lib/utils';

export default async function GroupsPage() {
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name_ar, color, capacity, division, programs(name_ar), enrollments(count)')
    .eq('enrollments.status', 'active')
    .order('created_at', { ascending: true });

  const { data: programs } = await supabase
    .from('programs')
    .select('id, name_ar')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المجموعات — Groups</h1>
      <CreateGroup
        programs={(programs ?? []).map((p) => ({ id: p.id as string, name_ar: p.name_ar as string }))}
      />

      {(groups ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">لا توجد مجموعات.</div>
      )}

      <div className="space-y-3">
        {(groups ?? []).map((g) => {
          const division = g.division as string | null;
          const active =
            (g.enrollments as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
          const oversized = active > RECOMMENDED_GROUP_SIZE;
          return (
            <div key={g.id as string} className="card p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <GroupSwatch color={g.color as string | null} />
                <Link href={`/dashboard/groups/${g.id as string}`} className="font-semibold hover:underline">
                  {g.name_ar as string}
                </Link>
                <span className="text-xs text-muted-foreground">
                  · {(g.programs as unknown as { name_ar: string } | null)?.name_ar}
                </span>
                {division && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {DIVISION_LABELS[division]?.ar ?? division}
                  </span>
                )}
                {oversized && (
                  <span
                    className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400"
                    title={`الحجم المُوصى به ${RECOMMENDED_GROUP_SIZE} — تنبيه فقط، لا يمنع الإضافة`}
                  >
                    {active} — أكبر من الموصى به
                  </span>
                )}
                <Link
                  href={`/dashboard/groups/${g.id as string}`}
                  className="-my-2 ms-auto py-2 text-xs font-medium text-primary hover:underline"
                >
                  الكشف والإضافة ←
                </Link>
              </div>
              <EditGroup
                group={{
                  id: g.id as string,
                  name_ar: g.name_ar as string,
                  color: (g.color as string) ?? null,
                  capacity: (g.capacity as number) ?? 15,
                  division,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
