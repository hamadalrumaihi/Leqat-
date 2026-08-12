import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { PaymentLedgerForm } from '@/components/payment-ledger-form';

export default async function PaymentsPage() {
  const t = await getTranslations('payments');
  const locale = await getLocale();
  const user = await getActiveUser();
  if (!user || user.role !== 'executive') redirect({ href: '/dashboard', locale });

  const supabase = await createClient();
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, currency, status, invoice_no, note, confirmed_at, parent_id, profiles:parent_id(full_name_ar)')
    .order('created_at', { ascending: false });

  const { data: parents } = await supabase
    .from('profiles')
    .select('id, full_name_ar')
    .eq('role', 'parent');

  const total = (payments ?? [])
    .filter((p) => p.status === 'whatsapp_confirmed' || p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-muted-foreground">إجمالي المؤكَّد</p>
          <p className="mt-1 text-2xl font-bold text-green-vibrant">
            {total.toLocaleString()} QAR
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted-foreground">عدد العمليات</p>
          <p className="mt-1 text-2xl font-bold">{(payments ?? []).length}</p>
        </div>
      </div>

      <PaymentLedgerForm
        parents={(parents ?? []).map((p) => ({ id: p.id as string, name: p.full_name_ar as string }))}
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-muted-foreground">
            <tr className="text-start">
              <th className="p-3 text-start">ولي الأمر</th>
              <th className="p-3 text-start">المبلغ</th>
              <th className="p-3 text-start">الحالة</th>
              <th className="p-3 text-start">الفاتورة</th>
              <th className="p-3 text-start">ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p) => (
              <tr key={p.id as string} className="border-b last:border-0">
                <td className="p-3">
                  {(p.profiles as unknown as { full_name_ar: string } | null)?.full_name_ar ?? '—'}
                </td>
                <td className="p-3">{Number(p.amount).toLocaleString()} {p.currency as string}</td>
                <td className="p-3">
                  <span className="rounded-full bg-green-vibrant/15 px-2 py-0.5 text-xs text-green-vibrant">
                    {p.status === 'whatsapp_confirmed' ? 'مؤكَّد (واتساب)' : (p.status as string)}
                  </span>
                </td>
                <td className="p-3">{(p.invoice_no as string) ?? '—'}</td>
                <td className="p-3 text-muted-foreground">{(p.note as string) ?? ''}</td>
              </tr>
            ))}
            {(payments ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  لا توجد عمليات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
