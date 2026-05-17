import createMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Refresh the Supabase auth session, then run the i18n middleware.
  const { response } = await updateSession(request);
  const intlResponse = intlMiddleware(request);

  // Carry over any Set-Cookie headers added by Supabase.
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      intlResponse.headers.append(key, value);
    }
  });

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
