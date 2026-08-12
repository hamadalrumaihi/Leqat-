'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { redeemInvite } from '@/lib/registration';
import type { AgeGroup } from '@/lib/age';

const AUTH_UNREACHABLE = 'تعذّر الوصول إلى الخادم. حاول مجددًا بعد قليل.';

// Bound an auth call so an unreachable Supabase (paused project, outage)
// returns a readable error instead of hanging the action into a 504.
async function bounded<T>(p: Promise<T>, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('auth timed out')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const REDEEM_ERRORS: Record<string, string> = {
  invite_invalid_or_expired: 'الرابط غير صالح أو انتهت صلاحيته.',
  email_in_use_or_invalid: 'البريد الإلكتروني مستخدم بالفعل أو غير صالح.',
  student_create_failed: 'تعذّر إنشاء سجل الطالب. حاول مجددًا.',
};

export async function redeemInviteAction(_: unknown, formData: FormData) {
  const policy = formData.get('policy_agree') === 'on';
  if (!policy) return { error: 'يجب الموافقة على لائحة البرنامج.' };

  const contacts: { name: string; phone: string; relation: string }[] = [];
  const ecNames = formData.getAll('ec_name').map(String);
  const ecPhones = formData.getAll('ec_phone').map(String);
  const ecRels = formData.getAll('ec_relation').map(String);
  ecNames.forEach((n, i) => {
    if (n.trim()) contacts.push({ name: n, phone: ecPhones[i] ?? '', relation: ecRels[i] ?? '' });
  });

  try {
    await redeemInvite({
      token: String(formData.get('token')),
      parentEmail: String(formData.get('parent_email')),
      parentName: String(formData.get('parent_name')),
      parentPhone: String(formData.get('parent_phone')),
      childName: String(formData.get('child_name')),
      childDob: String(formData.get('child_dob')),
      childAgeGroup: String(formData.get('child_age_group')) as AgeGroup,
      medicalNotes: String(formData.get('medical_notes') ?? '') || undefined,
      photoConsent: formData.get('photo_consent') === 'on',
      emergencyContacts: contacts,
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : 'unknown';
    return { error: REDEEM_ERRORS[code] ?? 'تعذّر إكمال التسجيل. تواصل عبر واتساب 72054558.' };
  }
  return { ok: true };
}

export async function sendMagicLinkAction(_: unknown, formData: FormData) {
  const email = String(formData.get('email') ?? '').toLowerCase().trim();
  if (!email) return { error: 'البريد الإلكتروني مطلوب' };

  const supabase = await createClient();
  try {
    const { error } = await bounded(
      supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/dashboard`,
        },
      }),
    );
    if (error) {
      console.error('[magic-link] error:', error.message);
      return { error: 'تعذّر إرسال الرابط. تحقّق من البريد.' };
    }
  } catch {
    return { error: AUTH_UNREACHABLE };
  }
  return { ok: true };
}

export async function loginAction(_: unknown, formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const supabase = await createClient();

  try {
    const { error } = await bounded(supabase.auth.signInWithPassword({ email, password }));
    if (error) return { error: error.message };
  } catch {
    return { error: AUTH_UNREACHABLE };
  }
  redirect('/dashboard');
}

export async function registerAction(_: unknown, formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const fullNameAr = String(formData.get('full_name_ar'));
  const phone = String(formData.get('phone') ?? '');
  const supabase = await createClient();

  try {
    const { error } = await bounded(
      supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name_ar: fullNameAr, role: 'parent', phone } },
      }),
    );
    if (error) return { error: error.message };
  } catch {
    return { error: AUTH_UNREACHABLE };
  }
  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
