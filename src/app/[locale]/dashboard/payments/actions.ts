'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, audit } from '@/lib/auth';
import { computeAmountQar, createCheckout, type Tier } from '@/lib/payments';

/** Public registration: add child → pick program → consent → enrol → invoice. */
export async function registerChildAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const supabase = await createClient();

  const programId = String(formData.get('program_id'));
  const tier = (String(formData.get('tier')) as Tier) || 'full_semester';
  const photoConsent = formData.get('photo_consent') === 'on';
  const medical = String(formData.get('medical') ?? '');
  const emName = String(formData.get('emergency_name') ?? '');
  const emPhone = String(formData.get('emergency_phone') ?? '');

  if (formData.get('medical_form') !== 'on' || !emName || !emPhone) {
    return { error: 'missing_required' }; // medical form + emergency contact required
  }

  const { data: program } = await supabase
    .from('programs')
    .select('id, price_qar, weeks, capacity, status')
    .eq('id', programId)
    .single();
  if (!program) return { error: 'no_program' };

  // Create the child (PII fields).
  const { data: student, error: sErr } = await supabase
    .from('students')
    .insert({
      parent_id: user.id,
      full_name_ar: String(formData.get('full_name_ar')),
      full_name_en: String(formData.get('full_name_en') ?? '') || null,
      dob: String(formData.get('dob') ?? '') || null,
      gender: String(formData.get('gender') ?? '') || null,
      age_grp: String(formData.get('age_grp') ?? '') || null,
      medical_notes: medical || null,
      emergency_contacts: [{ name: emName, phone: emPhone }],
      photo_consent: photoConsent,
    })
    .select('id')
    .single();
  if (sErr || !student) return { error: sErr?.message ?? 'student' };
  const studentId = (student as { id: string }).id;

  await supabase.from('consents').insert({
    student_id: studentId,
    parent_id: user.id,
    photo_consent: photoConsent,
    medical_form: { provided: true },
  });

  // Capacity check → active or waitlisted; auto-close when full.
  const { count } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .eq('status', 'active');
  const cap = (program as { capacity: number }).capacity;
  const full = (count ?? 0) >= cap;
  const status = full ? 'waitlisted' : 'pending';

  const { data: enrollment, error: eErr } = await supabase
    .from('enrollments')
    .insert({ student_id: studentId, program_id: programId, status, tier })
    .select('id')
    .single();
  if (eErr || !enrollment) return { error: eErr?.message ?? 'enroll' };

  if (full) {
    await supabase.from('programs').update({ status: 'closed' }).eq('id', programId);
  }

  // Pricing with sibling / multi-program discounts.
  const { count: siblingCount } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  const { data: parentProgs } = await supabase
    .from('enrollments')
    .select('program_id');
  const distinctProgs = new Set((parentProgs ?? []).map((r) => r.program_id));

  const { amount } = computeAmountQar({
    programPriceQar: Number((program as { price_qar: number }).price_qar),
    tier,
    weeks: Number((program as { weeks: number }).weeks),
    siblingCount: siblingCount ?? 0,
    multiProgram: distinctProgs.size > 1,
  });

  await supabase.from('payments').insert({
    enrollment_id: (enrollment as { id: string }).id,
    parent_id: user.id,
    amount,
    currency: 'QAR',
    provider: process.env.PAYMENT_PROVIDER ?? 'sandbox',
    status: 'pending',
  });

  await audit('registration.create', 'students', studentId, { programId, status });
  revalidatePath('/dashboard/payments');
  return { ok: true, waitlisted: full };
}

export async function payAction(_: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'unauthenticated' };
  const supabase = await createClient();
  const paymentId = String(formData.get('payment_id'));

  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, parent_id, enrollment_id, status')
    .eq('id', paymentId)
    .single();
  if (!payment || (payment as { parent_id: string }).parent_id !== user.id) {
    return { error: 'forbidden' };
  }
  if ((payment as { status: string }).status === 'paid') return { ok: true };

  const result = await createCheckout(
    Number((payment as { amount: number }).amount),
    paymentId,
  );
  if (result.status === 'redirect') return { redirect: result.url };
  if (result.status === 'error') return { error: result.message };

  const invoiceNo = `LQ-${Date.now().toString(36).toUpperCase()}`;
  await supabase
    .from('payments')
    .update({ status: 'paid', provider_ref: result.providerRef, invoice_no: invoiceNo })
    .eq('id', paymentId);

  const enrollmentId = (payment as { enrollment_id: string }).enrollment_id;
  if (enrollmentId) {
    await supabase
      .from('enrollments')
      .update({ status: 'active' })
      .eq('id', enrollmentId)
      .eq('status', 'pending');
  }

  await audit('payment.paid', 'payments', paymentId, { invoiceNo });
  revalidatePath('/dashboard/payments');
  return { ok: true, invoiceNo };
}
