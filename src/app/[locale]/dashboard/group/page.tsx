import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { GroupSwatch } from '@/components/group-swatch';
import { GroupRoster } from '@/components/group-roster';
import { ROSTER_SELECT, mapRosterRows } from '@/lib/roster';

export default async function MyGroupPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: staffRows } = await supabase
    .from('group_staff')
    .select('group_id, groups(id, name_ar, color)')
    .eq('profile_id', user!.id);

  const groups = (staffRows ?? [])
    .map((r) => r.groups as unknown as { id: string; name_ar: string; color: string | null } | null)
    .filter((g): g is { id: string; name_ar: string; color: string | null } => Boolean(g));

  if (groups.length === 0) {
    return <div className="card p-8 text-center text-muted-foreground">لم تُسنَد إليك مجموعة بعد.</div>;
  }

  // More than one group → let them pick.
  if (groups.length > 1) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">مجموعاتي</h1>
        {groups.map((g) => (
          <Link key={g.id} href={`/dashboard/groups/${g.id}`} className="card flex items-center gap-2 p-4 hover:bg-muted">
            <GroupSwatch color={g.color} />
            <span className="font-medium">{g.name_ar}</span>
          </Link>
        ))}
      </div>
    );
  }

  const g = groups[0];
  const { data: rows } = await supabase
    .from('enrollments')
    .select(ROSTER_SELECT)
    .eq('group_id', g.id)
    .order('id', { ascending: true });

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <GroupSwatch color={g.color} />
        {g.name_ar}
      </h1>
      <GroupRoster groupId={g.id} groupColor={g.color} initial={mapRosterRows(rows ?? [])} />
    </div>
  );
}
