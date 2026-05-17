'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Msg = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  pinned: boolean;
  moderation: string;
  createdAt: string;
};

export function ChatRoom({
  channelId,
  meId,
  initial,
  canModerate,
}: {
  channelId: string;
  meId: string;
  initial: Msg[];
  canModerate: boolean;
}) {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState('');
  const supabase = useRef(createClient());
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = supabase.current;
    const channel = sb
      .channel(`room:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const m = payload.new as Record<string, unknown>;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: m.id as string,
                    body: (m.body as string) ?? '',
                    senderId: m.sender_id as string,
                    senderName: '…',
                    pinned: m.is_announcement as boolean,
                    moderation: m.moderation as string,
                    createdAt: m.created_at as string,
                  },
                ],
          );
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [channelId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    await supabase.current.from('chat_messages').insert({
      channel_id: channelId,
      sender_id: meId,
      body,
      moderation: 'approved',
    });
  }

  const pinned = messages.filter((m) => m.pinned);

  return (
    <div className="card flex h-[70vh] flex-col">
      {pinned.length > 0 && (
        <div className="border-b bg-secondary/60 p-3 text-sm">
          <span className="font-semibold">📌 {t('pinned')}: </span>
          {pinned[pinned.length - 1].body}
        </div>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  m.moderation === 'pending' && 'opacity-60',
                )}
              >
                {!mine && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.senderName}</p>}
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.moderation === 'pending' && (
                  <p className="mt-1 text-[11px] italic">{t('moderationPending')}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('placeholder')}
          className="input"
        />
        <button onClick={send} className="btn-primary">
          {t('send')}
        </button>
      </div>
      {!canModerate && (
        <p className="px-3 pb-2 text-[11px] text-muted-foreground">
          {t('moderationPending')} — {t('pickup')}
        </p>
      )}
    </div>
  );
}
