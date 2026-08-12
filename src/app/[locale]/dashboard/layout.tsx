import { redirect } from '@/i18n/routing';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/utils';
import { navGroupsFor } from '@/lib/nav';
import { getMyPrograms, getActiveProgram } from '@/lib/program-context';
import { DashboardChrome } from '@/components/dashboard-chrome';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: '/login', locale });

  const t = await getTranslations('dashboard');
  const tn = await getTranslations('nav');
  const tb = await getTranslations('brand');
  const isAr = locale === 'ar';

  const sectionLabel: Record<string, string> = {
    myDay: t('secMyDay'),
    program: t('secProgram'),
    people: t('secPeople'),
    operations: t('secOperations'),
    settings: t('secSettings'),
  };

  // Program-specific role: the sidebar (both its items and the role
  // label) reflects the user's role in the ACTIVE program; falls back
  // to the global role. Page/action gates resolve the same way via
  // getActiveUser, so what the nav shows is what the gates allow.
  const [programs, active] = await Promise.all([getMyPrograms(), getActiveProgram()]);
  const effRole = active ? active.role : user!.role;

  const groups = navGroupsFor(effRole).map((g) => ({
    key: g.key,
    label: sectionLabel[g.key] ?? g.key,
    items: g.items.map((i) => ({ href: i.href, label: t(i.key) })),
  }));

  const label = (role: string) => ROLE_LABELS[role]?.[isAr ? 'ar' : 'en'] ?? role;
  const name = isAr ? user!.fullNameAr : user!.fullNameEn || user!.fullNameAr;

  const roleLabel = label(effRole);
  const switcherPrograms = programs.map((p) => ({ id: p.id, name: p.name_ar, roleLabel: label(p.role) }));

  return (
    <DashboardChrome
      groups={groups}
      brand={tb('name')}
      roleLabel={roleLabel}
      userName={name}
      userId={user!.id}
      programs={switcherPrograms}
      activeProgramId={active?.id ?? ''}
      programsLabel={t('switchProgram')}
      welcome={t('welcome')}
      logoutLabel={tn('logout')}
      menuLabel={t('menu')}
      notificationsLabel={t('notifications')}
    >
      {children}
    </DashboardChrome>
  );
}
