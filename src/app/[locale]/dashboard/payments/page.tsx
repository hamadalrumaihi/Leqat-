import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export default async function PaymentsPage() {
  const t = await getTranslations('payments');
  const supabase = await createClient();
  const user = await getCurrentUser();
  const isExec = user!.role === 'executive';

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, currency, status, provider, invoice_no, created_at')
    .order('created_at', { ascending: false });

  const total = (payments ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {isExec && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-sm text-muted-foreground">{t('paid')}</p>
            <p className="mt-1 text-2xl font-bold text-green-vibrant">
              {total.toLocaleString()} QAR
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-muted-foreground">{t('pending')}</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {(payments ?? []).filter((p) => p.status === 'pending').length}
            </p>
          </div>
        </div>
      )}

      <div className="card divide-y">
        {(payments ?? []).length === 0 && (
          <p className="p-6 text-center text-muted-foreground">
            لا توجد مدفوعات. يتم الدفع عبر Dibsy / MyFatoorah (QAR، Apple Pay،
            Google Pay) مع Stripe كبديل دولي.
          </p>
        )}
        {(payments ?? []).map((p) => (
          <div key={p.id as string} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">
                {Number(p.amount).toLocaleString()} {p.currency as string}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.provider as string} · {p.invoice_no as string}
              </p>
            </div>
            {p.status === 'paid' ? (
              <span className="rounded-full bg-green-vibrant/15 px-3 py-1 text-xs font-medium text-green-vibrant">
                {t('paid')}
              </span>
            ) : (
              <button className="btn-primary h-9 px-4">{t('pay')}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
