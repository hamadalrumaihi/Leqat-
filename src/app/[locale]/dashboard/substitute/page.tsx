import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { audit } from '@/lib/auth';
import { dualDate } from '@/lib/utils';
import { SubstituteLink } from '@/components/substitute-link';

export default async function SubstitutePage() {
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();

  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, week_no, group_id, groups(name_ar), stations(order_index, title_ar, duration_min, materials_ar, value_ar)')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return <div className="card p-8 text-center text-muted-foreground">لا توجد جلسة.</div>;
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('students(id, full_name_ar, medical_notes, emergency_contacts)')
    .eq('group_id', session.group_id)
    .eq('status', 'active');

  // Accessing PII (medical/emergency) is logged.
  await audit('substitute.view', 'sessions', session.id as string);

  const stations = ((session.stations as Record<string, unknown>[]) ?? [])
    .slice()
    .sort((a, b) => (a.order_index as number) - (b.order_index as number));
  const group = session.groups as unknown as { name_ar: string } | null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">وضع البديل — Substitute mode</h1>
        <p className="text-sm text-muted-foreground">
          عرض للقراءة فقط · {group?.name_ar} · {dualDate(session.date as string, locale)}
        </p>
      </div>

      <SubstituteLink sessionId={session.id as string} />

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">خطة الجلسة</h2>
        <ol className="space-y-2">
          {stations.map((st, i) => (
            <li key={i} className="rounded-md border bg-background p-3">
              <div className="flex justify-between text-sm font-medium">
                <span>
                  {i + 1}. {st.title_ar as string}
                </span>
                <span className="text-muted-foreground">{st.duration_min as number}د</span>
              </div>
              {st.materials_ar ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  المواد: {st.materials_ar as string}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">
          الكشف ({(enrollments ?? []).length}) — أيقونة 🚩 تعني ملاحظة طبية
        </h2>
        <ul className="divide-y">
          {(enrollments ?? []).map((e) => {
            const st = e.students as unknown as {
              id: string;
              full_name_ar: string;
              medical_notes: string | null;
              emergency_contacts: { name?: string; phone?: string }[] | null;
            } | null;
            if (!st) return null;
            const contact = (st.emergency_contacts ?? [])[0];
            return (
              <li key={st.id} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {st.full_name_ar} {st.medical_notes ? '🚩' : ''}
                  </span>
                  {contact?.phone ? (
                    <span dir="ltr" className="text-sm text-accent">
                      {contact.name ?? ''} {contact.phone}
                    </span>
                  ) : null}
                </div>
                {st.medical_notes ? (
                  <p className="mt-1 rounded bg-destructive/10 p-2 text-xs text-destructive">
                    {st.medical_notes}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
