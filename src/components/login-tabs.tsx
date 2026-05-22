'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { AuthForm } from '@/components/auth-form';
import { sendMagicLinkAction } from '@/app/[locale]/(auth)/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? '…' : 'إرسال رابط الدخول'}
    </button>
  );
}

function MagicLink() {
  const [state, action] = useFormState(sendMagicLinkAction, null as null | { ok?: boolean; error?: string });
  if (state?.ok) {
    return (
      <p className="rounded-md bg-secondary/60 p-4 text-center text-sm">
        تحقّق من بريدك. الرابط ينتهي خلال ساعة.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="ml-email">البريد الإلكتروني</label>
        <input id="ml-email" name="email" type="email" dir="ltr" className="input" required />
      </div>
      {state?.error && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>
      )}
      <Submit />
      <p className="text-center text-xs text-muted-foreground">
        يصلك رابط دخول إلى بريدك — لا حاجة لكلمة مرور.
      </p>
    </form>
  );
}

export function LoginTabs() {
  const [tab, setTab] = useState<'magic' | 'password'>('magic');
  return (
    <div className="space-y-4">
      <div className="flex rounded-lg bg-muted p-1 text-sm">
        <button
          onClick={() => setTab('magic')}
          className={`flex-1 rounded-md py-1.5 ${tab === 'magic' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}
        >
          رابط الدخول
        </button>
        <button
          onClick={() => setTab('password')}
          className={`flex-1 rounded-md py-1.5 ${tab === 'password' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}
        >
          كلمة المرور
        </button>
      </div>
      {tab === 'magic' ? <MagicLink /> : <AuthForm mode="login" />}
    </div>
  );
}
