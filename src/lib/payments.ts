// Pricing + payment-provider abstraction.
//
// Real gateways (Dibsy / MyFatoorah for QAR, Stripe fallback) plug in
// via createCheckout(). Until a provider key is configured the flow
// runs in `sandbox` mode so registration → payment → invoice is fully
// exercisable end to end without a merchant account.

export type Tier = 'full_semester' | 'per_session';

export type PriceInput = {
  programPriceQar: number;
  tier: Tier;
  weeks: number;
  siblingCount: number; // other active enrollments for this parent
  multiProgram: boolean; // parent enrolling into >1 program
};

export function computeAmountQar(p: PriceInput): { amount: number; lines: string[] } {
  const lines: string[] = [];
  let amount =
    p.tier === 'per_session'
      ? Math.round((p.programPriceQar / Math.max(p.weeks, 1)) * 100) / 100
      : p.programPriceQar;
  lines.push(`السعر الأساسي: ${amount} ر.ق`);

  if (p.siblingCount >= 1) {
    const d = amount * 0.1;
    amount -= d;
    lines.push(`خصم الإخوة (10%): -${d.toFixed(2)} ر.ق`);
  }
  if (p.multiProgram) {
    const d = amount * 0.05;
    amount -= d;
    lines.push(`خصم تعدد البرامج (5%): -${d.toFixed(2)} ر.ق`);
  }
  return { amount: Math.round(amount * 100) / 100, lines };
}

export type CheckoutResult =
  | { status: 'paid'; providerRef: string }
  | { status: 'redirect'; url: string }
  | { status: 'error'; message: string };

export function activeProvider(): string {
  const p = (process.env.PAYMENT_PROVIDER ?? 'sandbox').toLowerCase();
  if (p === 'dibsy' && !process.env.DIBSY_SECRET_KEY) return 'sandbox';
  if (p === 'myfatoorah' && !process.env.MYFATOORAH_API_KEY) return 'sandbox';
  if (p === 'stripe' && !process.env.STRIPE_SECRET_KEY) return 'sandbox';
  return p;
}

/**
 * Begin a checkout. In sandbox mode this settles immediately so the
 * rest of the flow (invoice, dashboard, capacity) can be demonstrated.
 * The real-gateway branches are where Dibsy/MyFatoorah/Stripe session
 * creation goes (returns a redirect URL).
 */
export async function createCheckout(
  amountQar: number,
  ref: string,
): Promise<CheckoutResult> {
  const provider = activeProvider();
  if (provider === 'sandbox') {
    return { status: 'paid', providerRef: `sandbox_${ref}` };
  }
  // Real providers are wired here once keys are present. Until then,
  // surface a clear, actionable error rather than failing silently.
  return {
    status: 'error',
    message: `بوابة الدفع (${provider}) غير مُهيّأة بعد — أضف المفاتيح في متغيرات البيئة.`,
  };
}
