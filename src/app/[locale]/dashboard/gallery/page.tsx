import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { childrenConsentForParent } from '@/lib/consent';
import { GalleryAdmin } from '@/components/gallery-admin';
import { GalleryUploader } from '@/components/gallery-uploader';

const STAFF = ['executive', 'program_supervisor', 'program_manager', 'group_supervisor', 'assistant_supervisor'];

export default async function GalleryPage() {
  const t = await getTranslations('gallery');
  const supabase = await createClient();
  const user = await getCurrentUser();
  const isStaff = user ? STAFF.includes(user.role) : false;

  const { data: albums } = await supabase
    .from('gallery_albums')
    .select('id, title_ar, is_highlight, group_id, created_at, gallery_media(id, path, caption_ar, blurred)')
    .order('created_at', { ascending: false });

  // Batch sign all media URLs (private bucket).
  const allPaths = (albums ?? []).flatMap((al) =>
    ((al.gallery_media as { path: string }[]) ?? []).map((m) => m.path),
  );
  const signed = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data } = await supabase.storage
      .from('gallery')
      .createSignedUrls(allPaths, 3600);
    for (const s of data ?? []) {
      if (s.signedUrl && s.path) signed.set(s.path, s.signedUrl);
    }
  }

  const groups = isStaff
    ? ((await supabase.from('groups').select('id, name_ar')).data ?? []).map((g) => ({
        id: g.id as string,
        name_ar: g.name_ar as string,
      }))
    : [];

  // Consent banner for parents.
  let consentWarning: string[] = [];
  if (user?.role === 'parent') {
    const children = await childrenConsentForParent();
    consentWarning = children.filter((c) => !c.consented).map((c) => c.nameAr);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="rounded-md bg-secondary/60 p-3 text-sm">{t('consentNotice')}</p>

      {consentWarning.length > 0 && (
        <p className="rounded-md bg-amber-500/15 p-3 text-sm text-amber-700">
          {t('noConsent')}: {consentWarning.join('، ')} — تُموَّه صور هؤلاء أو
          تُستبعد. يمكنك تعديل الموافقة من صفحة «موافقة نشر الصور».
        </p>
      )}

      {isStaff && <GalleryAdmin groups={groups} />}

      {(albums ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">—</div>
      )}

      {(albums ?? []).map((al) => {
        const media = (al.gallery_media as { id: string; path: string; caption_ar: string | null; blurred: boolean }[]) ?? [];
        return (
          <section key={al.id as string} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {al.title_ar as string}
                {al.is_highlight ? ' ⭐' : ''}
              </h2>
            </div>

            {isStaff && (
              <div className="mb-4">
                <GalleryUploader albumId={al.id as string} groupId={al.group_id as string} />
              </div>
            )}

            {media.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد وسائط بعد.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {media.map((m) => {
                  const url = signed.get(m.path);
                  return (
                    <div
                      key={m.id}
                      className="relative aspect-square overflow-hidden rounded-md bg-muted"
                      title={m.caption_ar ?? ''}
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={m.caption_ar ?? ''}
                          loading="lazy"
                          className={`h-full w-full object-cover ${m.blurred ? 'blur-xl' : ''}`}
                        />
                      ) : null}
                      {m.blurred && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white">
                          مموّه — بلا موافقة
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
