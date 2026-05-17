import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export default async function BooksPage() {
  const t = await getTranslations('books');
  const supabase = await createClient();

  const { data: books } = await supabase
    .from('books')
    .select('id, title_ar, title_en, year, type, description_ar')
    .order('year', { ascending: false });

  const { data: assignments } = await supabase
    .from('book_assignments')
    .select('id, chapter, due_date, books(title_ar)')
    .order('due_date', { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {(assignments ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t('assigned')}</h2>
          {(assignments ?? []).map((a) => (
            <div key={a.id as string} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{(a.books as unknown as { title_ar: string } | null)?.title_ar}</p>
                <p className="text-sm text-muted-foreground">{a.chapter as string}</p>
              </div>
              <span className="text-sm text-accent">
                {t('due')}: {String(a.due_date)}
              </span>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(books ?? []).map((b) => (
          <div key={b.id as string} className="card flex flex-col gap-3 p-5">
            <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-green-deep to-green-vibrant" />
            <div>
              <p className="font-medium">{b.title_ar as string}</p>
              <p className="latin-term text-xs text-muted-foreground">{String(b.year)}</p>
            </div>
            <button className="btn-outline mt-auto">
              {b.type === 'audio' ? t('audio') : t('open')}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        الملفات تُقدَّم عبر روابط موقَّعة مع علامة مائية باسم الطالب — لا تنزيل
        عام مباشر.
      </p>
    </div>
  );
}
