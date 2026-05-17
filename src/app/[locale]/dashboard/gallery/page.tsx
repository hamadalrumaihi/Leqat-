import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';

export default async function GalleryPage() {
  const t = await getTranslations('gallery');
  const supabase = await createClient();

  const { data: albums } = await supabase
    .from('gallery_albums')
    .select('id, title_ar, is_highlight, created_at, groups(name_ar), gallery_media(id, path, caption_ar)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="rounded-md bg-secondary/60 p-3 text-sm">{t('consentNotice')}</p>

      {(albums ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">—</div>
      )}

      {(albums ?? []).map((al) => {
        const media = (al.gallery_media as { id: string; caption_ar: string }[]) ?? [];
        return (
          <section key={al.id as string} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {al.title_ar as string}
                {al.is_highlight ? ' ⭐' : ''}
              </h2>
              <span className="text-sm text-muted-foreground">
                {(al.groups as unknown as { name_ar: string } | null)?.name_ar}
              </span>
            </div>
            {media.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد وسائط بعد — يرفع المشرف الصور بعد المراجعة.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {media.map((m) => (
                  <div
                    key={m.id}
                    className="aspect-square rounded-md bg-muted"
                    title={m.caption_ar}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
