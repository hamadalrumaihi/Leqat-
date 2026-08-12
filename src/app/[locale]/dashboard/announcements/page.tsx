import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { can, isStaff } from '@/lib/roles';
import { dualDate } from '@/lib/utils';
import { AnnouncementForm } from '@/components/announcement-form';
import { DeleteAnnouncementButton } from '@/components/announcement-delete';

export default async function AnnouncementsPage() {
  const user = await getActiveUser();
  const locale = await getLocale();
  if (!user || !isStaff(user.role)) redirect({ href: '/dashboard', locale });

  const t = await getTranslations('announce');
  const canManage = can(user!.role, 'manageActivities');
  const supabase = await createClient();

  // RLS returns only the announcements aimed at this caller (management
  // sees all).
  const { data } = await supabase
    .from('announcements')
    .select('id, title_ar, body_ar, audience, target_group_id, created_at, program_id, groups:target_group_id(name_ar)')
    .order('created_at', { ascending: false });
  const rows = (data ?? []) as unknown as {
    id: string; title_ar: string; body_ar: string | null; audience: string;
    target_group_id: string | null; created_at: string; program_id: string | null;
    groups: { name_ar: string } | null;
  }[];

  // Reference data for the create form (management only).
  let programId: string | null = null;
  let groups: { id: string; label: string }[] = [];
  let teachers: { id: string; label: string }[] = [];
  if (canManage) {
    const [{ data: progs }, { data: g }, { data: tch }] = await Promise.all([
      supabase.from('programs').select('id').order('created_at', { ascending: true }).limit(1),
      supabase.from('groups').select('id, name_ar'),
      supabase.from('profiles').select('id, full_name_ar').eq('role', 'specialist_teacher'),
    ]);
    programId = (progs?.[0]?.id as string) ?? null;
    groups = (g ?? []).map((x) => ({ id: x.id as string, label: x.name_ar as string }));
    teachers = (tch ?? []).map((x) => ({ id: x.id as string, label: x.full_name_ar as string }));
  }

  const audienceLabel = (a: string, groupName?: string | null) =>
    a === 'group' && groupName ? `${t('aud.group')} · ${groupName}` : t(`aud.${a}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        {canManage && <AnnouncementForm programId={programId} groups={groups} teachers={teachers} />}
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">{t('empty')}</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.title_ar}</p>
                  {a.body_ar ? <p className="mt-1 text-sm text-muted-foreground">{a.body_ar}</p> : null}
                </div>
                {canManage && <DeleteAnnouncementButton id={a.id} />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary/60 px-2 py-0.5">
                  {audienceLabel(a.audience, a.groups?.name_ar)}
                </span>
                <span dir="ltr">{dualDate(a.created_at.slice(0, 10), locale as 'ar' | 'en')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
