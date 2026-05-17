import { createClient } from '@/lib/supabase/server';
import { RecognitionForm } from '@/components/recognition-form';

export default async function RecognitionPage() {
  const supabase = await createClient();

  // Students visible to this staff member under RLS.
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name_ar')
    .order('full_name_ar', { ascending: true })
    .limit(200);

  const { data: recent } = await supabase
    .from('recognition_tokens')
    .select('id, value_ar, note_ar, created_at, students(full_name_ar)')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">التحفيز المعنوي — Recognition</h1>
      <p className="text-sm text-muted-foreground">
        تحفيز خاص يظهر على جدار الطفل ووليّه — لا توجد لوحات صدارة عامة.
      </p>

      {(students ?? []).length > 0 ? (
        <RecognitionForm
          students={(students ?? []).map((s) => ({
            id: s.id as string,
            name: s.full_name_ar as string,
          }))}
        />
      ) : (
        <div className="card p-8 text-center text-muted-foreground">
          لا يوجد طلاب في نطاقك.
        </div>
      )}

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">آخر ما مُنح</h2>
        {(recent ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <ul className="space-y-2">
            {(recent ?? []).map((r) => (
              <li key={r.id as string} className="flex items-center justify-between text-sm">
                <span>
                  {(r.students as unknown as { full_name_ar: string } | null)?.full_name_ar} —{' '}
                  <span className="text-green-vibrant">{r.value_ar as string}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at as string).toLocaleDateString('ar')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
