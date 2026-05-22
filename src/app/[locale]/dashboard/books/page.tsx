import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { Link } from '@/i18n/routing';
import { WorkbookProgress } from '@/components/workbook-progress';

const STAFF = ['executive', 'program_planner', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'];
const TABS = [
  { key: 'publications', ar: 'الإصدارات' },
  { key: 'workbooks', ar: 'كرّاسات البرامج' },
  { key: 'audio', ar: 'الإصدارات السمعية' },
] as const;

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const t = await getTranslations('books');
  const { tab } = await searchParams;
  const active = (TABS.find((x) => x.key === tab)?.key ?? 'publications') as string;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const isStaff = user ? STAFF.includes(user.role) : false;

  const { data: books } = await supabase
    .from('books')
    .select('id, title_ar, year, kind, type, program_id, file_path, programs(name_ar)')
    .order('year', { ascending: false });

  // Workbook progress (per group) and signed PDF URLs.
  const { data: progress } = await supabase
    .from('group_workbook_progress')
    .select('book_id, group_id, current_page, last_section, groups(name_ar)');

  const rows = (books ?? []).filter((b) => {
    if (active === 'publications') return b.kind === 'publication';
    if (active === 'audio') return b.kind === 'audio';
    return b.kind === 'workbook';
  });

  const signed = new Map<string, string>();
  if (active === 'workbooks' && isStaff) {
    const paths = rows.map((b) => b.file_path as string).filter(Boolean);
    if (paths.length > 0) {
      const { data } = await supabase.storage.from('books').createSignedUrls(paths, 3600);
      for (const s of data ?? []) if (s.signedUrl && s.path) signed.set(s.path, s.signedUrl);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="flex gap-2 border-b">
        {TABS.map((tb) => (
          <Link
            key={tb.key}
            href={`/dashboard/books?tab=${tb.key}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              active === tb.key ? 'border-primary font-medium text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {tb.ar}
          </Link>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">لا توجد عناصر.</div>
      )}

      {active === 'workbooks' ? (
        <div className="space-y-3">
          {rows.map((b) => {
            const prog = (progress ?? []).filter((p) => p.book_id === b.id);
            const pdf = signed.get(b.file_path as string);
            return (
              <div key={b.id as string} className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{b.title_ar as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {(b.programs as unknown as { name_ar: string } | null)?.name_ar}
                    </p>
                  </div>
                  {isStaff && pdf && (
                    <a href={pdf} target="_blank" rel="noopener noreferrer" className="btn-outline h-9 px-3 text-xs">
                      افتح الكرّاسة (PDF)
                    </a>
                  )}
                </div>
                {prog.map((p) => (
                  <div key={p.group_id as string} className="mt-3 rounded-md bg-muted/50 p-3">
                    <p className="text-sm">
                      {(p.groups as unknown as { name_ar: string } | null)?.name_ar} — الموضع الحالي:
                      صفحة {String(p.current_page)} · {(p.last_section as string) ?? ''}
                    </p>
                    {isStaff && (
                      <WorkbookProgress
                        groupId={p.group_id as string}
                        bookId={b.id as string}
                        page={(p.current_page as number) ?? 0}
                        section={(p.last_section as string) ?? ''}
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((b) => (
            <div key={b.id as string} className="card flex flex-col gap-3 p-5">
              <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-green-deep to-green-vibrant" />
              <div>
                <p className="font-medium">{b.title_ar as string}</p>
                <p className="latin-term text-xs text-muted-foreground">{String(b.year ?? '')}</p>
              </div>
              <button className="btn-outline mt-auto">
                {active === 'audio' ? t('audio') : t('open')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
