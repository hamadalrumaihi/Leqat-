'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { createAnnouncementAction } from '@/app/[locale]/dashboard/announcements/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Opt = { id: string; label: string };
const AUDIENCES = [
  'all_staff',
  'executives',
  'managers',
  'group_supervisors',
  'specialist_teachers',
  'group',
  'teacher',
] as const;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-10 px-4" disabled={pending}>
      {pending ? '…' : label}
    </button>
  );
}

export function AnnouncementForm({
  programId,
  groups,
  teachers,
}: {
  programId: string | null;
  groups: Opt[];
  teachers: Opt[];
}) {
  const t = useTranslations('announce');
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<string>('all_staff');
  const [state, action] = useFormState(createAnnouncementAction, null as null | { ok?: boolean; error?: string });
  const seen = useRef<unknown>(null);

  // Toast feedback + auto-close on success (fires once per action result).
  useEffect(() => {
    if (!state || state === seen.current) return;
    seen.current = state;
    if (state.ok) {
      toast.success(t('published'));
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error === 'forbidden' ? t('failed') : t('failed'));
    }
  }, [state, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="btn-primary h-10 px-4">{t('create')}</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t('create')}</DialogTitle>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          {programId && <input type="hidden" name="program_id" value={programId} />}
          <div>
            <label className="label">{t('titleField')}</label>
            <input name="title_ar" className="input" required />
          </div>
          <div>
            <label className="label">{t('body')}</label>
            <textarea name="body_ar" rows={2} className="input h-auto py-2" />
          </div>
          <div>
            <label className="label">{t('audience')}</label>
            <select name="audience" value={audience} onChange={(e) => setAudience(e.target.value)} className="input">
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{t(`aud.${a}`)}</option>
              ))}
            </select>
          </div>
          {audience === 'group' && (
            <div>
              <label className="label">{t('targetGroup')}</label>
              <select name="target_group_id" className="input" required>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
          )}
          {audience === 'teacher' && (
            <div>
              <label className="label">{t('targetTeacher')}</label>
              <select name="target_profile_id" className="input" required>
                {teachers.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
          )}
          <div className="pt-1">
            <Submit label={t('publish')} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
