import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/program-context';
import { AddItem, Checkout, ReturnBtn } from '@/components/inventory-controls';

export default async function InventoryPage() {
  const supabase = await createClient();
  const user = await getActiveUser();

  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, name_ar, total_qty')
    .order('name_ar', { ascending: true });

  const { data: open } = await supabase
    .from('inventory_checkouts')
    .select('id, item_id, qty, taken_at')
    .is('returned_at', null);

  const outByItem = new Map<string, number>();
  for (const c of open ?? [])
    outByItem.set(c.item_id as string, (outByItem.get(c.item_id as string) ?? 0) + Number(c.qty));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المخزون — Inventory</h1>

      {user?.role === 'executive' && <AddItem />}

      {(items ?? []).length === 0 && (
        <div className="card p-8 text-center text-muted-foreground">لا توجد عناصر.</div>
      )}

      <div className="space-y-3">
        {(items ?? []).map((it) => {
          const out = outByItem.get(it.id as string) ?? 0;
          const available = Number(it.total_qty) - out;
          return (
            <div key={it.id as string} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{it.name_ar as string}</p>
                  <p className="text-xs text-muted-foreground">
                    المتاح {available} من {it.total_qty as number} · مُخرَج {out}
                  </p>
                </div>
                {available > 0 && <Checkout itemId={it.id as string} />}
              </div>

              {(open ?? []).filter((c) => c.item_id === it.id).length > 0 && (
                <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                  {(open ?? [])
                    .filter((c) => c.item_id === it.id)
                    .map((c) => (
                      <li key={c.id as string} className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          مُخرَج {c.qty as number} ·{' '}
                          {new Date(c.taken_at as string).toLocaleDateString('ar')}
                        </span>
                        <ReturnBtn checkoutId={c.id as string} />
                      </li>
                    ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
