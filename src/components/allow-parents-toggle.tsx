'use client';

import { useFormState } from 'react-dom';
import { setParentsCanPostAction } from '@/app/[locale]/dashboard/chat/actions';

export function AllowParentsToggle({
  channelId,
  allowed,
}: {
  channelId: string;
  allowed: boolean;
}) {
  const [, action] = useFormState(setParentsCanPostAction, null);
  return (
    <form action={action} className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <input type="hidden" name="channel_id" value={channelId} />
      <input type="hidden" name="allow" value={String(!allowed)} />
      <span>السماح للأهالي بالكتابة</span>
      <button className={`btn h-7 px-3 ${allowed ? 'bg-green-vibrant text-white' : 'btn-outline'}`}>
        {allowed ? 'مفعّل' : 'معطّل'}
      </button>
    </form>
  );
}
