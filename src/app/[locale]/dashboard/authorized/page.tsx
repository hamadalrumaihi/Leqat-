import { createClient } from '@/lib/supabase/server';
import { AuthorizedForm } from '@/components/authorized-form';
import { toggleAuthorizedAction } from '@/app/[locale]/dashboard/authorized/actions';

export default async function AuthorizedPage() {
  const supabase = await createClient();

  const [{ data: students }, { data: persons }] = await Promise.all([
    supabase.from('students').select('id, full_name_ar'),
    supabase
      .from('authorized_pickup_persons')
      .select('id, name, phone, relation, active, students(full_name_ar)')
      .order('created_at', { ascending: true }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">أشخاص مصرّح لهم بالاستلام</h1>
      <AuthorizedForm
        students={(students ?? []).map((s) => ({ id: s.id as string, name: s.full_name_ar as string }))}
      />

      {(persons ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">لا يوجد أشخاص مصرّح لهم.</div>
      )}

      <div className="space-y-2">
        {(persons ?? []).map((p) => (
          <div key={p.id as string} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-medium">
                {p.name as string}{' '}
                <span className="text-xs text-muted-foreground">
                  {(p.relation as string) ?? ''} · {(p.students as unknown as { full_name_ar: string } | null)?.full_name_ar}
                </span>
              </p>
              {p.phone ? <p dir="ltr" className="text-xs text-muted-foreground">{p.phone as string}</p> : null}
            </div>
            <form action={toggleAuthorizedAction}>
              <input type="hidden" name="id" value={p.id as string} />
              <input type="hidden" name="active" value={String(!p.active)} />
              <button className={`btn h-8 px-3 text-xs ${p.active ? 'btn-outline' : 'bg-green-vibrant text-white'}`}>
                {p.active ? 'تعطيل' : 'تفعيل'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
