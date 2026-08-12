'use server';

import { audit } from '@/lib/auth';
import { getActiveUser } from '@/lib/program-context';
import { signSubstituteToken } from '@/lib/token';
import { can } from '@/lib/roles';

export async function createSubstituteLinkAction(
  _: unknown,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const user = await getActiveUser();
  if (!can(user?.role, 'manageSubstitute')) return { error: 'forbidden' };

  const sessionId = String(formData.get('session_id'));
  try {
    const token = signSubstituteToken(sessionId, 240); // 4-hour window
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    await audit('substitute.link_create', 'sessions', sessionId);
    return { url: `${base}/substitute/${token}` };
  } catch {
    return { error: 'not_configured' };
  }
}
