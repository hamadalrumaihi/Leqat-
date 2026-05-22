import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { PickupParent, PickupQueue } from '@/components/pickup-client';

const STAFF = ['executive', 'program_planner', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'];

export default async function PickupPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const isStaff = user ? STAFF.includes(user.role) : false;

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return <div className="card p-8 text-center text-muted-foreground">لا توجد جلسة.</div>;
  }
  const sessionId = session.id as string;

  if (isStaff) {
    const { data: waiting } = await supabase
      .from('pickup_status')
      .select('id, arrived_at, picked_up_by_name, students(full_name_ar), parent:profiles!pickup_status_parent_id_fkey(full_name_ar, phone)')
      .eq('session_id', sessionId)
      .not('arrived_at', 'is', null)
      .is('released_at', null)
      .order('arrived_at', { ascending: true });

    const initial = (waiting ?? []).map((r) => {
      const parent = r.parent as unknown as { full_name_ar: string; phone: string | null } | null;
      return {
        id: r.id as string,
        studentName: (r.students as unknown as { full_name_ar: string } | null)?.full_name_ar ?? '—',
        person: (r.picked_up_by_name as string) || 'ولي الأمر',
        parentName: parent?.full_name_ar ?? null,
        parentPhone: parent?.phone ?? null,
        arrivedAt: r.arrived_at as string,
      };
    });

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">طابور الاستلام — Pickup queue</h1>
        <PickupQueue sessionId={sessionId} initial={initial} />
      </div>
    );
  }

  // Parent
  const { data: students } = await supabase.from('students').select('id, full_name_ar');
  const { data: authorized } = await supabase
    .from('authorized_pickup_persons')
    .select('name, phone')
    .eq('active', true);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الاستلام — Pickup</h1>
      <PickupParent
        sessionId={sessionId}
        kids={(students ?? []).map((s) => ({ id: s.id as string, name: s.full_name_ar as string }))}
        authorized={(authorized ?? []).map((a) => ({ name: a.name as string, phone: (a.phone as string) ?? null }))}
      />
    </div>
  );
}
