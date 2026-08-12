import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can } from '@/lib/roles';
import { ActivityForm } from '@/components/activity-form';
import { ActivityList, type ActivityRow } from '@/components/activity-list';

export default async function ActivitiesPage() {
  const user = await getActiveUser();
  const locale = await getLocale();
  if (!user || !can(user.role, 'viewActivities')) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('activities');
  const canManage = can(user!.role, 'manageActivities');
  const supabase = await createClient();

  // RLS returns only approved rows to non-management staff; management
  // sees everything. Ordering: in-flight first, then approved.
  const { data } = await supabase
    .from('activities')
    .select('id, title_ar, category, objective_ar, duration_min, age_grp, max_group_size, status')
    .order('created_at', { ascending: false });

  const activities = (data ?? []) as ActivityRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {canManage && <ActivityForm />}
      </div>
      {!canManage && (
        <p className="text-sm text-muted-foreground">{t('approvedOnly')}</p>
      )}
      <ActivityList activities={activities} canManage={canManage} />
    </div>
  );
}
