'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { loginAction, registerAction } from '@/app/[locale]/(auth)/actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {label}
    </button>
  );
}

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const t = useTranslations('auth');
  const action = mode === 'login' ? loginAction : registerAction;
  const [state, formAction] = useFormState(action, null as null | { error: string });

  return (
    <form action={formAction} className="space-y-4">
      {mode === 'register' && (
        <>
          <div>
            <label className="label" htmlFor="full_name_ar">{t('fullName')}</label>
            <input id="full_name_ar" name="full_name_ar" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="phone">{t('phone')}</label>
            <input id="phone" name="phone" className="input" inputMode="tel" />
          </div>
        </>
      )}
      <div>
        <label className="label" htmlFor="email">{t('email')}</label>
        <input id="email" name="email" type="email" className="input" required dir="ltr" />
      </div>
      <div>
        <label className="label" htmlFor="password">{t('password')}</label>
        <input id="password" name="password" type="password" className="input" required dir="ltr" />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{t('error')}</p>
      )}

      <Submit label={t('submit')} />

      <p className="text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>
            {t('noAccount')}{' '}
            <Link href="/register" className="font-medium text-primary">{t('registerTitle')}</Link>
          </>
        ) : (
          <>
            {t('haveAccount')}{' '}
            <Link href="/login" className="font-medium text-primary">{t('loginTitle')}</Link>
          </>
        )}
      </p>
    </form>
  );
}
