'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/roles';

export async function addItemAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'executive') return;
  const supabase = await createClient();
  await supabase.from('inventory_items').insert({
    name_ar: String(formData.get('name_ar')),
    name_en: String(formData.get('name_en') ?? '') || null,
    total_qty: Number(formData.get('total_qty') ?? 0),
  });
  revalidatePath('/dashboard/inventory');
}

export async function checkoutItemAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'manageInventory')) return;
  const supabase = await createClient();
  await supabase.from('inventory_checkouts').insert({
    item_id: String(formData.get('item_id')),
    qty: Math.max(1, Number(formData.get('qty') ?? 1)),
    taken_by: user.id,
  });
  revalidatePath('/dashboard/inventory');
}

export async function returnCheckoutAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, 'manageInventory')) return;
  const supabase = await createClient();
  await supabase
    .from('inventory_checkouts')
    .update({ returned_at: new Date().toISOString() })
    .eq('id', String(formData.get('checkout_id')));
  revalidatePath('/dashboard/inventory');
}
