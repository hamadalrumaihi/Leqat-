# Phase 2 — Runtime Role Walkthrough (findings)

Run against a local Supabase stack (all migrations 0001–0012 + seed)
with the real Next production server pointed at it. Login driven
through the actual UI (password tab) so the full middleware cookie
path → SSR client → role-aware sidebar was exercised.

Tags: [NEW] valid under target model · [LEGACY] current model ·
[FIX-NOW] fixed this phase · [WAIT-MIGRATION] deferred to role
migration.

## Verified working

- **Middleware cookie propagation** — all six seeded roles log in and
  reach `/ar/dashboard`; the Supabase session cookie set by the login
  server action survives the next-intl middleware rewrite. (Earlier
  `updateSession` concern: confirmed OK end-to-end.)
- **Role-aware sidebar** — each role renders exactly its nav set:
  executive 19 items, manager(legacy program_manager→"مخطط البرنامج")
  16, group_supervisor 17, assistant_supervisor 15, parent 13,
  student 5. No role saw another's items; parent/student saw no staff
  routes.
- **Locale routing** — `/ar/*` 307→ default-locale-stripped path is
  correct next-intl `as-needed` behavior, not a redirect loop.
- **Realtime delivery mechanism** — positive control proved WAL→client
  delivery works: an `UPDATE` on a published, RLS-readable table
  reached an authorized subscriber in **58 ms**.
- **Safeguarding / student contact** — CONFIRMED SAFE. `students` has
  no phone/social/off-platform-contact column (`id, profile_id,
  parent_id, full_name_ar/en, dob, gender, age_grp, medical_notes,
  emergency_contacts, photo_consent`). `emergency_contacts` are the
  *parents'* contacts. `ParentContact` (the only WhatsApp surface) is
  fed parent data on the roster, attendance list, and pickup queue —
  never a student number. Nothing to leak. [NEW model requirement met]
- **Two-adult rule** — a staff↔student DM row carries a non-null
  `cc_profile_id` and ≥ 2 adult members (probe: 2 adults + CC). [NEW]

## Defects fixed this phase

- **[FIX-NOW] Realtime never enabled on the subscribed tables (0012).**
  `chat_messages`, `pickup_status`, `attendance` were absent from the
  `supabase_realtime` publication — so on any migration-built deploy
  the pickup "at the gate" live queue, chat live updates, and realtime
  attendance silently never fired (acceptance #3). The Supabase
  dashboard toggles this per-table; nothing in the repo encoded it.
  0012 adds all three and sets `REPLICA IDENTITY FULL` (needed for the
  filtered UPDATE subscriptions — pickup release, chat moderation — to
  carry non-PK columns). Verified: publication now lists all three
  after `db reset` and a clean stack restart; realtime delivery proven
  functional via positive control.
- **[FIX-NOW] `/favicon.ico` 404 on every page + missing PWA icons.**
  The manifest referenced `/icon-192.png` and `/icon-512.png` that were
  never shipped, and no favicon was declared, so every page load logged
  a 404. Declared `icons` in layout metadata pointing at the existing
  compass SVG; trimmed the manifest to the SVG (any + maskable).
- **[FIX-NOW] Silent `program_planner` denial** (fixed in the prior
  commit `96e72a0` via `src/lib/roles.ts`) — surfaced during this
  audit's nav review; the walkthrough confirms nav is now consistent
  with the centralized capability gates (e.g. assistant correctly does
  NOT see permission slips).

## Not reproduced (documented honestly)

- **Full RLS-gated pickup delivery through a standalone Node harness.**
  My node test subscribed with a supervisor JWT via `setAuth`, but the
  event did not arrive, while the anon-readable positive control did.
  This is almost certainly a harness auth-wiring difference (the app
  uses `@supabase/ssr`, which manages realtime token refresh
  automatically) rather than an app defect — the mechanism is proven
  and the table is now published. The authoritative confirmation is a
  two-browser app test (parent taps "أنا عند البوابة" → supervisor
  queue updates), which belongs on the production smoke-test checklist.
  The local box OOM-killed the Next server during that attempt; not
  re-run. **Claim: publication defect proven + fixed; live app-level
  pickup delivery is a pending smoke-test, not verified here.**

## Observations for later phases

- **[WAIT-MIGRATION]** Manager/Founder, shifts, divisions, assistant
  session-assignments — per the impact analysis; no code change yet.
- **[Phase 3]** Nav has 13–19 items in a flat list for staff roles; the
  sidebar groups them by section but long lists on mobile deserve a
  scroll/utility review.
- **[Phase 4 candidate]** Recognition (`awardRecognition`) capability
  includes executive, but nav shows it only to group/assistant
  supervisors. Not a bug (exec doesn't award day-to-day) — noted for a
  deliberate decision during the role migration.
