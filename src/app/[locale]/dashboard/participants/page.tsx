import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { isManagement } from '@/lib/roles';
import { AGE_LABEL_AR, AGE_LABEL_EN, type AgeGroup } from '@/lib/age-groups';
import { dualDate } from '@/lib/utils';
import { ParticipantsTable, type ParticipantRow } from '@/components/participants-table';

export default async function ParticipantsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user || !isManagement(user.role)) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('participants');
  const ts = await getTranslations('enrollStatus');
  const isAr = locale === 'ar';
  const supabase = await createClient();

  const { data: program } = await supabase
    .from('programs')
    .select('id, name_ar')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!program) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="card p-8 text-center text-muted-foreground">{t('noProgram')}</div>
      </div>
    );
  }

  const { data } = await supabase
    .from('enrollments')
    .select('id, status, created_at, students(full_name_ar, full_name_en, age_grp), groups(name_ar)')
    .eq('program_id', program.id as string)
    .order('created_at', { ascending: true });

  const ageLabel = (g: string | null) =>
    g ? (isAr ? AGE_LABEL_AR : AGE_LABEL_EN)[g as AgeGroup] ?? g : '—';

  const rows: ParticipantRow[] = (data ?? []).map((e) => {
    const s = e.students as unknown as { full_name_ar: string; full_name_en: string | null; age_grp: string | null } | null;
    const g = e.groups as unknown as { name_ar: string } | null;
    return {
      name: (isAr ? s?.full_name_ar : s?.full_name_en || s?.full_name_ar) ?? '—',
      group: g?.name_ar ?? '—',
      level: ageLabel(s?.age_grp ?? null),
      status: ts(e.status as string),
      enrolled: dualDate((e.created_at as string).slice(0, 10), locale as 'ar' | 'en'),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <span className="text-sm text-muted-foreground">{program.name_ar as string}</span>
      </div>
      <ParticipantsTable rows={rows} />
    </div>
  );
}
