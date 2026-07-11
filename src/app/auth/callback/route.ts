import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PKCE exchange for email links (magic link / invite). GoTrue verifies
// the token and redirects here with ?code=; without this route the
// code was dropped on the dashboard redirect and the user landed on
// /login with no session. Lives outside [locale] and is excluded from
// the i18n middleware matcher.
// Relative Location keeps the browser on the host it arrived on —
// request.url's host is normalized by Next (127.0.0.1 → localhost),
// and an absolute redirect built from it can hop hosts and strand the
// freshly set session cookies on the original host.
function relativeRedirect(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  // Same-origin relative paths only — never redirect off-site.
  const rawNext = searchParams.get('next') ?? '/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return relativeRedirect(next);
  }
  return relativeRedirect('/login?error=link');
}
