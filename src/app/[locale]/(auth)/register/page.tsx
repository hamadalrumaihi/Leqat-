import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/logo';
import { AuthForm } from '@/components/auth-form';

export default async function RegisterPage({
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
        <h1 className="mb-2 text-center text-2xl font-bold">{t('registerTitle')}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          أنشئ حسابك ثم أضف أبناءك واختر البرنامج وأكمل الموافقات والدفع.
        </p>
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
