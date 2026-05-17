'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  sendMessageAction,
  moderateMessageAction,
  reactAction,
} from '@/app/[locale]/dashboard/chat/actions';

type Msg = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  pinned: boolean;
  moderation: string;
  mediaPath: string | null;
  mediaKind: string | null;
  createdAt: string;
};

const EMOJIS = ['❤️', '👍', '🤲', '🌟'];

export function ChatRoom({
  channelId,
  groupId,
  meId,
  initial,
  canModerate,
}: {
  channelId: string;
  groupId: string;
  meId: string;
  initial: Msg[];
  canModerate: boolean;
}) {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState('');
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const supabase = useRef(createClient());
  const endRef = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const sb = supabase.current;
    const ch = sb
      .channel(`room:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const m = payload.new as Record<string, unknown>;
          if (!m?.id) return;
          setMessages((prev) => {
            const next: Msg = {
              id: m.id as string,
              body: (m.body as string) ?? '',
              senderId: m.sender_id as string,
              senderName: prev.find((x) => x.senderId === m.sender_id)?.senderName ?? '…',
              pinned: m.is_announcement as boolean,
              moderation: m.moderation as string,
              mediaPath: (m.media_path as string) ?? null,
              mediaKind: (m.media_kind as string) ?? null,
              createdAt: m.created_at as string,
            };
            const i = prev.findIndex((x) => x.id === next.id);
            if (i >= 0) {
              const copy = prev.slice();
              copy[i] = next;
              return copy;
            }
            return [...prev, next];
          });
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [channelId]);

  // Sign media URLs lazily (private bucket).
  useEffect(() => {
    const missing = messages.filter((m) => m.mediaPath && !signed[m.mediaPath]);
    if (missing.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const m of missing) {
        const { data } = await supabase.current.storage
          .from('chat-media')
          .createSignedUrl(m.mediaPath!, 3600);
        if (data?.signedUrl) updates[m.mediaPath!] = data.signedUrl;
      }
      if (Object.keys(updates).length) setSigned((s) => ({ ...s, ...updates }));
    })();
  }, [messages, signed]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function sendText() {
    const body = text.trim();
    if (!body) return;
    setText('');
    const fd = new FormData();
    fd.set('channel_id', channelId);
    fd.set('body', body);
    if (canModerate) fd.set('announce', 'false');
    await sendMessageAction(null, fd);
  }

  async function uploadAndSend(file: Blob, kind: 'image' | 'voice', ext: string) {
    let blob = file;
    if (kind === 'image' && file instanceof File) {
      blob = await imageCompression(file, {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1600,
        fileType: 'image/webp',
        useWebWorker: true,
      });
    }
    const path = `${groupId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.current.storage
      .from('chat-media')
      .upload(path, blob, { upsert: false });
    if (error) return;
    const fd = new FormData();
    fd.set('channel_id', channelId);
    fd.set('media_path', path);
    fd.set('media_kind', kind);
    await sendMessageAction(null, fd);
  }

  async function toggleRecord() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        uploadAndSend(new Blob(chunks, { type: 'audio/webm' }), 'voice', 'webm');
      };
      mr.start();
      recorder.current = mr;
      setRecording(true);
    } catch {
      /* mic denied */
    }
  }

  const pinned = messages.filter((m) => m.pinned && m.moderation === 'approved');

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
          const isPending = m.moderation === 'pending';
          if (isPending && !mine && !canModerate) return null;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  isPending && 'opacity-70 ring-1 ring-amber-400',
                )}
              >
                {!mine && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.senderName}</p>}
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}

                {m.mediaPath && m.mediaKind === 'image' && signed[m.mediaPath] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={signed[m.mediaPath]} alt="" className="mt-1 max-h-60 rounded-lg" />
                )}
                {m.mediaPath && m.mediaKind === 'voice' && signed[m.mediaPath] && (
                  <audio controls src={signed[m.mediaPath]} className="mt-1 w-56" />
                )}

                {isPending && (
                  <p className="mt-1 text-[11px] italic">{t('moderationPending')}</p>
                )}

                {isPending && canModerate && (
                  <div className="mt-2 flex gap-2">
                    {(['approved', 'rejected'] as const).map((d) => (
                      <form
                        key={d}
                        action={async (fd) => {
                          fd.set('message_id', m.id);
                          fd.set('decision', d);
                          await moderateMessageAction(null, fd);
                          setMessages((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, moderation: d } : x)),
                          );
                        }}
                      >
                        <button className="rounded bg-white/20 px-2 py-0.5 text-[11px]">
                          {d === 'approved' ? 'اعتماد' : 'رفض'}
                        </button>
                      </form>
                    ))}
                  </div>
                )}

                {!isPending && (
                  <div className="mt-1 flex gap-1">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={async () => {
                          const fd = new FormData();
                          fd.set('message_id', m.id);
                          fd.set('emoji', e);
                          await reactAction(null, fd);
                        }}
                        className="text-xs opacity-60 hover:opacity-100"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t p-3">
        <label className="btn-ghost cursor-pointer" title="صورة">
          🖼️
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAndSend(f, 'image', 'webp');
            }}
          />
        </label>
        <button
          onClick={toggleRecord}
          className={cn('btn-ghost', recording && 'text-destructive')}
          title={t('voiceNote')}
        >
          {recording ? '■' : '🎤'}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendText()}
          placeholder={t('placeholder')}
          className="input"
        />
        <button onClick={sendText} className="btn-primary">
          {t('send')}
        </button>
      </div>
    </div>
  );
}
