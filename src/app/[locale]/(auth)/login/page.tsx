import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/logo';
import { AuthForm } from '@/components/auth-form';

const DEMO = [
  ['exec@leqat.qa', 'مشرف تنفيذي عام'],
  ['psup@leqat.qa', 'مشرف برنامج'],
  ['pmgr@leqat.qa', 'مدير برنامج'],
  ['gsup@leqat.qa', 'مشرف مجموعة'],
  ['asup@leqat.qa', 'مشرف مساعد'],
  ['parent@leqat.qa', 'ولي أمر'],
  ['student@leqat.qa', 'طالب'],
];

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const tb = await getTranslations('brand');

  return (
    <div className="container flex min-h-screen max-w-md flex-col justify-center py-12">
      <Link href="/" className="mx-auto mb-6 flex items-center gap-2">
        <Logo className="h-12 w-12 shrink-0" />
        <span className="text-lg font-bold text-primary">{tb('name')}</span>
      </Link>
      <div className="card p-8">
        <h1 className="mb-6 text-center text-2xl font-bold">{t('loginTitle')}</h1>
        <AuthForm mode="login" />
      </div>
      <details className="card mt-4 p-4 text-sm">
        <summary className="cursor-pointer font-medium">{t('demoAccounts')}</summary>
        <ul className="mt-3 space-y-1 text-muted-foreground">
          {DEMO.map(([email, role]) => (
            <li key={email} className="flex justify-between gap-2">
              <span dir="ltr">{email}</span>
              <span>{role}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
