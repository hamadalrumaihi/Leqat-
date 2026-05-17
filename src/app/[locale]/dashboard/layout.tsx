import { redirect } from '@/i18n/routing';
import { getLocale, getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/utils';
import { navFor } from '@/lib/nav';
import { DashboardNav } from '@/components/dashboard-nav';
import { logoutAction } from '@/app/[locale]/(auth)/actions';
import { Logo } from '@/components/logo';

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
  const items = navFor(user!.role).map((n) => ({ ...n, label: t(n.key) }));
  const roleLabel = ROLE_LABELS[user!.role]?.[locale === 'ar' ? 'ar' : 'en'];
  const name = locale === 'ar' ? user!.fullNameAr : user!.fullNameEn || user!.fullNameAr;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b bg-card lg:w-64 lg:border-e lg:border-b-0">
        <div className="flex items-center gap-2 p-4">
          <Logo className="h-9 w-9" />
          <div>
            <p className="text-sm font-bold text-primary">لِ.قات</p>
            <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <DashboardNav items={items} />
        <form action={logoutAction} className="p-4">
          <button className="btn-outline w-full">{tn('logout')}</button>
        </form>
      </aside>

      <main className="flex-1 bg-muted/30">
        <header className="border-b bg-background px-6 py-4">
          <p className="text-sm text-muted-foreground">{t('welcome')}</p>
          <p className="font-semibold">{name}</p>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
