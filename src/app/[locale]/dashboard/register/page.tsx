import { createClient } from '@/lib/supabase/server';
import { RegisterChildForm } from '@/components/register-child-form';

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from('programs')
    .select('id, name_ar, price_qar')
    .eq('status', 'open')
    .order('start_date', { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تسجيل طفل في برنامج</h1>
      <p className="text-sm text-muted-foreground">
        أضف بيانات طفلك، اختر البرنامج والباقة، أكمل الموافقات، ثم تابع الدفع.
      </p>
      {(programs ?? []).length === 0 ? (
        <div className="card p-8 text-center text-muted-foreground">
          لا توجد برامج مفتوحة للتسجيل حاليًا.
        </div>
      ) : (
        <RegisterChildForm
          programs={(programs ?? []).map((p) => ({
            id: p.id as string,
            name_ar: p.name_ar as string,
            price_qar: Number(p.price_qar),
          }))}
        />
      )}
    </div>
  );
}
