import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/logo';
import { AuthForm } from '@/components/auth-form';
import { InviteRegisterForm } from '@/components/invite-register-form';
import { lookupInvite } from '@/lib/registration';

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invite?: string }>;
}) {
  const { locale } = await params;
  const { invite } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const tb = await getTranslations('brand');

  const Header = (
    <Link href="/" className="mx-auto mb-6 flex items-center gap-2">
      <Logo className="h-12 w-12 shrink-0" />
      <span className="text-lg font-bold text-primary">{tb('name')}</span>
    </Link>
  );

  // ── Invite mode (WhatsApp registration link) ──────────────────
  if (invite) {
    const row = await lookupInvite(invite);
    if (!row) {
      return (
        <div className="container flex min-h-screen max-w-md flex-col justify-center py-12">
          {Header}
          <div className="card p-8 text-center">
            <p className="font-semibold text-destructive">الرابط غير صالح أو انتهت صلاحيته.</p>
            <p className="mt-2 text-sm text-muted-foreground">تواصل عبر واتساب 72054558.</p>
          </div>
        </div>
      );
    }
    const program = row.programs as unknown as { name_ar: string } | null;
    const programName = program?.name_ar ?? 'البرنامج';
    return (
      <div className="container flex min-h-screen max-w-xl flex-col justify-center py-12">
        {Header}
        <h1 className="mb-6 text-center text-2xl font-bold">تسجيل في {programName}</h1>
        <InviteRegisterForm
          token={invite}
          programName={programName}
          phoneHint={(row.parent_phone_hint as string) ?? null}
        />
      </div>
    );
  }

  // ── Generic self-registration ─────────────────────────────────
  return (
    <div className="container flex min-h-screen max-w-md flex-col justify-center py-12">
      {Header}
      <div className="card p-8">
        <h1 className="mb-2 text-center text-2xl font-bold">{t('registerTitle')}</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          أنشئ حسابك ثم أضف أبناءك واختر البرنامج وأكمل الموافقات.
        </p>
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
