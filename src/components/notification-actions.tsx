'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  markNotificationReadAction,
  markAllReadAction,
} from '@/app/[locale]/dashboard/notifications/actions';

function Pending({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? '…' : children}
    </button>
  );
}

export function MarkReadButton({ id }: { id: string }) {
  const t = useTranslations('notif');
  const [, action] = useFormState(markNotificationReadAction, null);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <Pending className="h-8 rounded-md border border-input px-3 text-xs">{t('markRead')}</Pending>
    </form>
  );
}

export function MarkAllReadButton() {
  const t = useTranslations('notif');
  const [, action] = useFormState(markAllReadAction, null);
  return (
    <form action={action}>
      <Pending className="btn-outline h-9 px-4">{t('markAll')}</Pending>
    </form>
  );
}
