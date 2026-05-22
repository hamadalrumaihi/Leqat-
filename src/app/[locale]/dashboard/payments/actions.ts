'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';

// Registration + payment stay on WhatsApp for v1; this is a manual,
// executive-only ledger of WhatsApp-confirmed transfers (§13).
export async function addPaymentAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'executive') return { error: 'forbidden' };
  const supabase = await createClient();

  const { error } = await supabase.from('payments').insert({
    parent_id: String(formData.get('parent_id')),
    amount: Number(formData.get('amount') ?? 0),
    currency: 'QAR',
    provider: 'whatsapp',
    status: 'whatsapp_confirmed',
    invoice_no: String(formData.get('invoice_no') ?? '') || null,
    note: String(formData.get('note') ?? '') || null,
    confirmed_by: user.id,
    confirmed_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  await audit('payment.confirm', 'payments', undefined, {
    parentId: String(formData.get('parent_id')),
  });
  revalidatePath('/dashboard/payments');
  return { ok: true };
}
