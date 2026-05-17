import { getLocale } from 'next-intl/server';
import { childrenConsentForParent } from '@/lib/consent';
import { ConsentToggle } from '@/components/consent-toggle';

export default async function ConsentPage() {
  const locale = await getLocale();
  const children = await childrenConsentForParent();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">موافقة نشر الصور — Photo consent</h1>
      <p className="rounded-md bg-secondary/60 p-3 text-sm">
        لا تظهر صورة طفلك في أي منشور جماعي دون موافقتك الصريحة. الافتراضي =
        لا توجد موافقة. يمكنك سحب الموافقة في أي وقت، وتُطبَّق على كل المنشورات
        السابقة فورًا.
      </p>

      {children.length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">
          لا يوجد أبناء مسجّلون.
        </div>
      )}

      <div className="space-y-3">
        {children.map((c) => (
          <div key={c.studentId} className="card flex items-center justify-between gap-4 p-5">
            <div>
              <p className="font-medium">
                {locale === 'ar' ? c.nameAr : c.nameEn || c.nameAr}
              </p>
              <p className={`text-sm ${c.consented ? 'text-green-vibrant' : 'text-muted-foreground'}`}>
                {c.consented ? 'الموافقة سارية' : 'لا توجد موافقة'}
              </p>
            </div>
            <ConsentToggle studentId={c.studentId} consented={c.consented} />
          </div>
        ))}
      </div>
    </div>
  );
}
