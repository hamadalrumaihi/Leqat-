import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/routing';
import { GroupSwatch } from '@/components/group-swatch';
import { CreateGroup, EditGroup } from '@/components/group-forms';

export default async function GroupsPage() {
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name_ar, color, capacity, programs(name_ar)')
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
        {(groups ?? []).map((g) => (
          <div key={g.id as string} className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <GroupSwatch color={g.color as string | null} />
              <Link href={`/dashboard/groups/${g.id as string}`} className="font-semibold hover:underline">
                {g.name_ar as string}
              </Link>
              <span className="text-xs text-muted-foreground">
                · {(g.programs as unknown as { name_ar: string } | null)?.name_ar}
              </span>
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
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
