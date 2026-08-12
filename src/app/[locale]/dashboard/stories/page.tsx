import { createClient } from '@/lib/supabase/server';
import { StoryCreate } from '@/components/story-create';
import { quotientLabel } from '@/lib/utils';

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('stories')
    .select('id, title_ar, body_ar, value_ar, age_grp, quotient')
    .order('created_at', { ascending: false })
    .limit(100);
  if (q) query = query.ilike('title_ar', `%${q}%`);
  const { data: stories } = await query;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">مكتبة القصص التربوية</h1>
      <p className="text-sm text-muted-foreground">
        بنك قصص مفهرس حسب القيمة والفئة والبُعد — اسحب قصة لمحطة القصة بدل الارتجال.
      </p>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="ابحث بعنوان القصة…"
          className="input"
        />
        <button className="btn-outline h-11 px-4">بحث</button>
      </form>

      <StoryCreate />

      {(stories ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">لا توجد قصص.</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(stories ?? []).map((s) => (
          <article key={s.id as string} className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{s.title_ar as string}</h2>
              {s.quotient ? (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {quotientLabel(s.quotient as string)}
                </span>
              ) : null}
            </div>
            {s.value_ar ? (
              <p className="mt-1 text-xs text-accent">{s.value_ar as string}</p>
            ) : null}
            {s.body_ar ? (
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {s.body_ar as string}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
