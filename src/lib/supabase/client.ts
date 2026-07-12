'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Prime the realtime socket with the user's JWT. Login happens in a
  // server action, so the browser client only ever emits INITIAL_SESSION
  // — which supabase-js does NOT forward to realtime (only SIGNED_IN /
  // TOKEN_REFRESHED are). Without this, postgres_changes channels join
  // as `anon` and every RLS-gated subscription (pickup queue, chat,
  // attendance) fails server-side with "invalid column for filter".
  void client.realtime.setAuth();

  return client;
}
