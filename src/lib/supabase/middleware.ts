import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the user so the session cookie is refreshed when needed.
  // Bounded + guarded: if Supabase is unreachable (paused project,
  // DNS/network outage) supabase-js keeps retrying the fetch, which
  // used to block the middleware past the platform's 25s limit and
  // turn EVERY page into a 504. Degrade to "signed out" instead.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('auth refresh timed out')), 5000);
      }),
    ]);
  } catch (e) {
    console.error('[middleware] auth refresh failed:', e instanceof Error ? e.message : e);
  } finally {
    clearTimeout(timer);
  }

  return { response, supabase };
}
