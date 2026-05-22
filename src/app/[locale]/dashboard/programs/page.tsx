import { createClient } from '@/lib/supabase/server';
import { CreateProgram, EditProgram } from '@/components/program-forms';

const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة',
  open: 'مفتوح',
  closed: 'مغلق',
  archived: 'مؤرشف',
};

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from('programs')
    .select('id, name_ar, type, age_grp, quotient, value_ar, value_en, ramadan_mode, status')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">البرامج — Programs</h1>
      <CreateProgram />

      {(programs ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">لا توجد برامج.</div>
      )}

      <div className="space-y-3">
        {(programs ?? []).map((p) => (
          <div key={p.id as string} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="font-semibold">{p.name_ar as string}</span>
                <span className="ms-2 text-xs text-muted-foreground">
                  {p.type === 'daily' ? 'يومي' : 'أسبوعي'}
                  {p.quotient ? ` · ${p.quotient as string}` : ''}
                  {p.value_ar ? ` · ${p.value_ar as string}` : ''}
                </span>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                {STATUS_LABEL[p.status as string] ?? (p.status as string)}
              </span>
            </div>
            <EditProgram
              program={{
                id: p.id as string,
                quotient: (p.quotient as string) ?? '',
                value_ar: (p.value_ar as string) ?? '',
                value_en: (p.value_en as string) ?? '',
                ramadan_mode: Boolean(p.ramadan_mode),
                status: (p.status as string) ?? 'draft',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
