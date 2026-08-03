'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { deleteAnnouncementAction } from '@/app/[locale]/dashboard/announcements/actions';

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-8 w-8 shrink-0 rounded-md border border-input text-muted-foreground hover:bg-muted"
    >
      {pending ? '…' : '✕'}
    </button>
  );
}

export function DeleteAnnouncementButton({ id }: { id: string }) {
  const [, action] = useFormState(deleteAnnouncementAction, null);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <Btn />
    </form>
  );
}
