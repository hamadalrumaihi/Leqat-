import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { dualDate } from '@/lib/utils';
import { can } from '@/lib/roles';
import { SlipCreate } from '@/components/slip-create';
import { SlipSign } from '@/components/slip-sign';

export default async function SlipsPage() {
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();
  const user = await getActiveUser();
  const isStaff = can(user?.role, 'manageSlips');

  const { data: slips } = await supabase
    .from('permission_slips')
    .select('id, title_ar, body_ar, due_date, created_at, permission_slip_signatures(student_id, signed_name)')
    .order('created_at', { ascending: false });

  const programs = isStaff
    ? ((await supabase.from('programs').select('id, name_ar')).data ?? []).map((p) => ({
        id: p.id as string,
        name_ar: p.name_ar as string,
      }))
    : [];

  const myChildren =
    user?.role === 'parent'
      ? ((await supabase.from('students').select('id, full_name_ar')).data ?? []).map((s) => ({
          id: s.id as string,
          name: s.full_name_ar as string,
        }))
      : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">أذونات الرحلات — Trip permission slips</h1>
      {isStaff && <SlipCreate programs={programs} />}

      {(slips ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">—</div>
      )}

      {(slips ?? []).map((s) => {
        const sigs = (s.permission_slip_signatures as { student_id: string; signed_name: string }[]) ?? [];
        return (
          <article key={s.id as string} className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{s.title_ar as string}</h2>
              {s.due_date ? (
                <span className="text-xs text-muted-foreground">
                  {dualDate(s.due_date as string, locale)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.body_ar as string}</p>

            {isStaff && (
              <p className="mt-3 text-sm text-accent">
                التواقيع: {sigs.length}
              </p>
            )}

            {user?.role === 'parent' && myChildren.length > 0 && (
              <SlipSign
                slipId={s.id as string}
                kids={myChildren.map((c) => ({
                  ...c,
                  signed: sigs.some((x) => x.student_id === c.id),
                }))}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
