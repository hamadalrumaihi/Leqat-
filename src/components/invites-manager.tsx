'use client';

import { useState } from 'react';
import { Copy, MessageCircle, X } from 'lucide-react';
import { createInvite, revokeInvite } from '@/app/[locale]/dashboard/programs/[id]/invites/actions';

export type InviteRow = {
  token: string;
  parentNameHint: string | null;
  parentPhoneHint: string | null;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  consumedParentName: string | null;
};

function inviteUrl(siteUrl: string, token: string) {
  const base = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/ar/register?invite=${token}`;
}

function waLink(phone: string, programName: string, url: string) {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.length === 8 ? `974${digits}` : digits;
  const text = encodeURIComponent(`أهلًا، رابط تسجيل ابنك في برنامج ${programName}: ${url}`);
  return `https://wa.me/${intl}?text=${text}`;
}

function statusOf(inv: InviteRow): { label: string; tone: string } {
  if (inv.consumedAt)
    return { label: `مُستخدم${inv.consumedParentName ? ` — ${inv.consumedParentName}` : ''}`, tone: 'bg-green-vibrant/15 text-green-vibrant' };
  if (new Date(inv.expiresAt) < new Date())
    return { label: 'منتهي', tone: 'bg-muted text-muted-foreground' };
  return { label: 'قيد الانتظار', tone: 'bg-amber-500/15 text-amber-700' };
}

export function InvitesManager({
  programId,
  programName,
  siteUrl,
  initial,
}: {
  programId: string;
  programName: string;
  siteUrl: string;
  initial: InviteRow[];
}) {
  const [invites, setInvites] = useState<InviteRow[]>(initial);
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ url: string; phone: string } | null>(null);

  async function generate() {
    setBusy(true);
    const res = await createInvite({
      programId,
      parentNameHint: name,
      parentPhoneHint: phone,
      notes,
    });
    setBusy(false);
    if ('error' in res) return;
    setCreated({ url: res.url, phone });
    setInvites((prev) => [
      {
        token: res.token,
        parentNameHint: name || null,
        parentPhoneHint: phone || null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 86400e3).toISOString(),
        consumedAt: null,
        consumedParentName: null,
      },
      ...prev,
    ]);
  }

  function reset() {
    setDialog(false);
    setCreated(null);
    setName('');
    setPhone('');
    setNotes('');
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">روابط التسجيل</h2>
        <button onClick={() => setDialog(true)} className="btn-primary h-9 px-3 text-sm">
          إنشاء رابط جديد
        </button>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={reset} />
          <div className="relative w-full max-w-md rounded-lg bg-card p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">رابط تسجيل جديد</h3>
              <button onClick={reset} className="btn-ghost" aria-label="close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!created ? (
              <div className="space-y-3">
                <div>
                  <label className="label">اسم ولي الأمر (اختياري)</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">رقم الواتساب (اختياري)</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" dir="ltr" />
                </div>
                <div>
                  <label className="label">ملاحظات</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input h-auto py-2" />
                </div>
                <button onClick={generate} disabled={busy} className="btn-primary w-full">
                  {busy ? '…' : 'إنشاء'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input readOnly dir="ltr" value={created.url} onFocus={(e) => e.currentTarget.select()} className="input text-xs" />
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard?.writeText(created.url)}
                    className="btn-outline h-10 flex-1 gap-1.5"
                  >
                    <Copy className="h-4 w-4" /> نسخ
                  </button>
                  {created.phone && (
                    <a
                      href={waLink(created.phone, programName, created.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary h-10 flex-1 gap-1.5"
                    >
                      <MessageCircle className="h-4 w-4" /> إرسال عبر واتساب
                    </a>
                  )}
                </div>
                <button onClick={reset} className="btn-ghost w-full">تم</button>
              </div>
            )}
          </div>
        </div>
      )}

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا روابط بعد.</p>
      ) : (
        <ul className="divide-y">
          {invites.map((inv) => {
            const st = statusOf(inv);
            const url = inviteUrl(siteUrl, inv.token);
            const pending = !inv.consumedAt && new Date(inv.expiresAt) >= new Date();
            return (
              <li key={inv.token} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{inv.parentNameHint || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.parentPhoneHint ? <span dir="ltr">{inv.parentPhoneHint} · </span> : null}
                    {new Date(inv.createdAt).toLocaleDateString('ar')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${st.tone}`}>{st.label}</span>
                  {pending && (
                    <>
                      <button
                        onClick={() => navigator.clipboard?.writeText(url)}
                        className="btn-ghost h-8 w-8"
                        aria-label="نسخ الرابط"
                        title="نسخ الرابط"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          await revokeInvite(inv.token, programId);
                          setInvites((prev) =>
                            prev.map((x) =>
                              x.token === inv.token ? { ...x, expiresAt: new Date().toISOString() } : x,
                            ),
                          );
                        }}
                        className="text-xs text-destructive"
                      >
                        إلغاء
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
