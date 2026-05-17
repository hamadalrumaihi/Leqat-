import { createClient } from '@/lib/supabase/server';
import { dualDate } from '@/lib/utils';
import { getLocale } from 'next-intl/server';

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = (await getLocale()) as 'ar' | 'en';
  const supabase = await createClient();

  const { data: p } = await supabase
    .from('payments')
    .select('id, amount, currency, status, invoice_no, created_at, provider, enrollments(tier, programs(name_ar, name_en), students(full_name_ar))')
    .eq('id', id)
    .maybeSingle();

  if (!p) {
    return <div className="card p-8 text-center text-muted-foreground">—</div>;
  }

  const enr = p.enrollments as unknown as
    | { tier: string; programs: { name_ar: string } | null; students: { full_name_ar: string } | null }
    | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card space-y-4 p-8">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="text-xl font-bold text-primary">لِ.قات — Le.Qat</p>
            <p className="text-sm text-muted-foreground">فاتورة — Invoice</p>
          </div>
          <div className="text-end text-sm">
            <p className="font-mono">{p.invoice_no as string}</p>
            <p className="text-muted-foreground">
              {dualDate(p.created_at as string, locale)}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <Row k="الطالب — Student" v={enr?.students?.full_name_ar ?? '—'} />
          <Row k="البرنامج — Program" v={enr?.programs?.name_ar ?? '—'} />
          <Row
            k="الباقة — Tier"
            v={enr?.tier === 'per_session' ? 'بالجلسة' : 'الفصل كامل'}
          />
          <Row k="طريقة الدفع — Provider" v={p.provider as string} />
          <Row
            k="الحالة — Status"
            v={p.status === 'paid' ? 'مدفوع — Paid' : (p.status as string)}
          />
        </div>

        <div className="flex items-center justify-between border-t pt-4 text-lg font-bold">
          <span>الإجمالي — Total</span>
          <span>
            {Number(p.amount).toLocaleString()} {p.currency as string}
          </span>
        </div>

        <p className="border-t pt-4 text-center text-xs text-muted-foreground">
          هذه فاتورة رسمية صادرة عن برنامج مهندس الحياة — قطر · شكرًا لكم
        </p>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
