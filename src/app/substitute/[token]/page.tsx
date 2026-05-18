import { verifySubstituteToken } from '@/lib/token';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SubstituteLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sessionId = verifySubstituteToken(token);

  if (!sessionId) {
    return (
      <div className="container flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">الرابط غير صالح أو منتهي الصلاحية.</p>
      </div>
    );
  }

  // Unauthenticated but token-gated: service role + strict scoping.
  const admin = createAdminClient();
  const { data: session } = await admin
    .from('sessions')
    .select('id, date, group_id, groups(name_ar), stations(order_index, title_ar, duration_min, materials_ar)')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) {
    return (
      <div className="container flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">الجلسة غير موجودة.</p>
      </div>
    );
  }

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('students(full_name_ar, medical_notes, emergency_contacts)')
    .eq('group_id', session.group_id)
    .eq('status', 'active');

  await admin.from('audit_log').insert({
    actor_id: null,
    action: 'substitute.link_view',
    entity: 'sessions',
    entity_id: sessionId,
    meta: { via: 'magic_link' },
  });

  const stations = ((session.stations as Record<string, unknown>[]) ?? [])
    .slice()
    .sort((a, b) => (a.order_index as number) - (b.order_index as number));
  const group = session.groups as unknown as { name_ar: string } | null;

  return (
    <div className="container max-w-2xl space-y-5 py-8">
      <div className="rounded-lg bg-amber-500/15 p-3 text-sm text-amber-700">
        وصول مؤقّت للبديل — للقراءة فقط · الرابط محدود بمدة.
      </div>
      <h1 className="text-2xl font-bold">
        {group?.name_ar} · {String(session.date)}
      </h1>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">خطة الجلسة</h2>
        <ol className="space-y-2">
          {stations.map((st, i) => (
            <li key={i} className="rounded-md border bg-background p-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>{i + 1}. {st.title_ar as string}</span>
                <span className="text-muted-foreground">{st.duration_min as number}د</span>
              </div>
              {st.materials_ar ? (
                <p className="mt-1 text-xs text-muted-foreground">المواد: {st.materials_ar as string}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">الكشف · 🚩 = ملاحظة طبية</h2>
        <ul className="divide-y">
          {(enrollments ?? []).map((e, idx) => {
            const st = e.students as unknown as {
              full_name_ar: string;
              medical_notes: string | null;
              emergency_contacts: { name?: string; phone?: string }[] | null;
            } | null;
            if (!st) return null;
            const c = (st.emergency_contacts ?? [])[0];
            return (
              <li key={idx} className="py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {st.full_name_ar} {st.medical_notes ? '🚩' : ''}
                  </span>
                  {c?.phone ? (
                    <span dir="ltr" className="text-sm text-accent">
                      {c.name ?? ''} {c.phone}
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
