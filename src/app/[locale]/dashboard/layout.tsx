import { redirect } from '@/i18n/routing';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/utils';
import { navGroupsFor } from '@/lib/nav';
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
  const isAr = locale === 'ar';

  const sectionLabel: Record<string, string> = {
    myDay: t('secMyDay'),
    program: t('secProgram'),
    people: t('secPeople'),
    operations: t('secOperations'),
    settings: t('secSettings'),
  };

  const groups = navGroupsFor(user!.role).map((g) => ({
    key: g.key,
    label: sectionLabel[g.key] ?? g.key,
    items: g.items.map((i) => ({ href: i.href, label: t(i.key) })),
  }));

  const roleLabel = ROLE_LABELS[user!.role]?.[isAr ? 'ar' : 'en'] ?? user!.role;
  const name = isAr ? user!.fullNameAr : user!.fullNameEn || user!.fullNameAr;

  return (
    <DashboardChrome
      groups={groups}
      brand="لِ.قات"
      roleLabel={roleLabel}
      userName={name}
      welcome={t('welcome')}
      logoutLabel={tn('logout')}
      menuLabel={t('menu')}
    >
      {children}
    </DashboardChrome>
  );
}
