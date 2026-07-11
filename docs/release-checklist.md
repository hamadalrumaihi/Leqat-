# Release checklist — برنامج مهندس الحياة

## Before deploy

- [ ] CI green (lint, typecheck, build, migration chain `db reset`)
- [ ] `supabase db push` dry-run lists only NEW migrations (never edit
      an applied one — forward-only)
- [ ] Supabase Auth: Site URL = production domain; Redirect URLs
      include `https://<domain>/auth/callback`
- [ ] Env vars present in Vercel (see docs/deploy.md table); confirm
      `SUPABASE_SERVICE_ROLE_KEY` is NOT prefixed `NEXT_PUBLIC_`
- [ ] `supabase/seed.sql` NOT applied to production

## Smoke tests (production, ~15 min, two phones + one laptop)

Local pre-release equivalents exist as scripts (run against the local
stack): `walkthrough.mjs`, `ui-audit.mjs`, `pickup-realtime-test.mjs`,
`magic-link-test.mjs`, `substitute-test.mjs`, `storage-test.mjs`.

1. **Password login** — one staff + one parent account reach
   `/dashboard`, sidebar matches the role.
2. **Magic link** — login page default tab → email arrives → link
   lands authenticated on the dashboard (exercises `/auth/callback`).
3. **Realtime pickup (two devices)** — parent taps «أنا عند البوابة»
   → supervisor queue shows the child's name within ~1s WITHOUT
   reload; supervisor taps «تم التسليم» → parent flips to
   «تم تسليم الطفل» live. If either direction is dead, check that
   0012 applied (`select * from pg_publication_tables where pubname =
   'supabase_realtime'` must list chat_messages, pickup_status,
   attendance).
4. **Chat** — the channel list must NOT read "no channels" (0016 fixed
   an RLS recursion that killed chat). Send a text + a voice note in a
   group channel from one device, appears live on the other with the
   sender's name; media plays via signed URL. Negative: as a parent,
   `GET /rest/v1/profiles?id=eq.<another member>&select=email,phone`
   must return `[]` (0015).
5. **Attendance** — mark 3 students on mobile; toggle airplane mode
   mid-way; marks flush when back online (offline queue).
6. **Gallery** — staff upload with consent gate; parent of a
   consented child sees it; image loads via signed URL (not a public
   URL).
7. **Substitute link** — generate on `/dashboard/substitute`, open in
   a private window: plan + roster render read-only; alter one
   character of the token: rejected.
8. **Registration invite** — create an invite link, open in a private
   window, register a child; enrollment appears with `group_id null`
   (unassigned pool); consume the same link again: rejected.
9. **Brand check** — browser tab, PWA install prompt, and email
   sender all say «برنامج مهندس الحياة» (never the retired name).

## Rollback

- **App**: Vercel → Deployments → promote the previous deployment
  (instant; env vars unchanged).
- **Database**: migrations are forward-only and additive so far —
  RLS/grants/publication changes from 0009–0014 are safe to leave in
  place under an older app build. If a future migration must be
  undone, write a new down-style migration; never delete or edit an
  applied file (the CLI tracks hashes).
- **Realtime regression**: disabling a table in the publication is a
  safe partial rollback (`alter publication supabase_realtime drop
  table <t>`), the UI degrades to reload-based behavior.

## Known-limitations register (v1)

- Weekly digest requires `RESEND_API_KEY`; otherwise stub mode.
- Payments ledger is WhatsApp-led; `PAYMENT_PROVIDER=sandbox` settles
  immediately and is for demos only.
- Push notifications (FCM) are scaffolded but not enabled.
- Role-model migration (Founder/Manager/shifts/divisions) is designed
  but deliberately not applied — see docs/role-model-impact-analysis.md.
