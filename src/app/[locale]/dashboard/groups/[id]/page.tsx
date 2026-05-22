import { createClient } from '@/lib/supabase/server';
import { GroupSwatch } from '@/components/group-swatch';
import { GroupRoster } from '@/components/group-roster';
import { ROSTER_SELECT, mapRosterRows } from '@/lib/roster';

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from('groups')
    .select('id, name_ar, color')
    .eq('id', id)
    .maybeSingle();

  if (!group) {
    return <div className="card p-8 text-center text-muted-foreground">المجموعة غير موجودة.</div>;
  }

  const { data: rows } = await supabase
    .from('enrollments')
    .select(ROSTER_SELECT)
    .eq('group_id', id)
    .order('id', { ascending: true });

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <GroupSwatch color={group.color as string | null} />
        {group.name_ar as string}
      </h1>
      <GroupRoster
        groupId={id}
        groupColor={(group.color as string) ?? null}
        initial={mapRosterRows(rows ?? [])}
      />
    </div>
  );
}
