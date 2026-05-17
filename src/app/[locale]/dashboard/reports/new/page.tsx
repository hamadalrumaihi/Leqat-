import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { dualDate } from '@/lib/utils';
import { ReportEditor } from '@/components/report-editor';

export default async function NewReportPage() {
  const t = await getTranslations('reports');
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();

  // Most recent session in a group the current user can write to.
  const { data: session } = await supabase
    .from('sessions')
    .select('id, date, week_no, groups(name_ar)')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return <div className="card p-8 text-center text-muted-foreground">—</div>;
  }

  const { data: existing } = await supabase
    .from('reports')
    .select('summary_ar, highlights_ar')
    .eq('session_id', session.id)
    .maybeSingle();

  const group = session.groups as unknown as { name_ar: string } | null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {group?.name_ar} · {dualDate(session.date as string, locale)}
        </p>
      </div>
      <ReportEditor
        sessionId={session.id as string}
        initial={{
          summaryAr: (existing?.summary_ar as string) ?? '',
          highlightsAr: (existing?.highlights_ar as string) ?? '',
        }}
      />
    </div>
  );
}
