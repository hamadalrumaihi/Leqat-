'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function loginAction(_: unknown, formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect('/dashboard');
}

export async function registerAction(_: unknown, formData: FormData) {
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const fullNameAr = String(formData.get('full_name_ar'));
  const phone = String(formData.get('phone') ?? '');
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name_ar: fullNameAr, role: 'parent', phone } },
  });
  if (error) return { error: error.message };
  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
