# Phase 3 — Arabic UX / RTL / mobile audit (findings + fixes)

Method: `scripts/ui-audit.mjs` drives the real login UI per role and
captures **128 screens** — AR + EN across marketing, auth, and the
role dashboards (public, group_supervisor, executive, parent, student)
at 375×812 / 768×1024 / 1440×1000 — with automated probes per screen:
`dir`/`lang` correctness, horizontal overflow, raw i18n-key leakage,
sub-36px touch targets, console/page errors. Visual review on top of
that. Run against the local stack (migrations 0001–0014 + seed) on the
production build.

## Result summary

| Probe                      | Before | After |
|----------------------------|--------|-------|
| dir/lang mismatches        | 0      | 0     |
| Horizontal overflow        | 0      | 0     |
| Raw i18n keys rendered     | 0      | 0     |
| Console / page errors      | 0      | 0     |
| Small-target reports       | 20     | 7*    |
| Role logins                | 6/6    | 6/6   |

\* Remainder is threshold noise: 18px checkboxes (standard size, label
adjacent), 32–36px desktop-only links, word-width nav items. Nothing
smaller than 32px remains on a touch path; primary controls are ≥40px.

## Fixed this phase (UI)

- **Login tabs hardcoded Arabic** — «رابط الدخول/كلمة المرور», the
  magic-link form, sent-state, and hint leaked into `/en`. Moved to
  the `auth` catalog (AR copy unchanged). Tabs 32→40px.
- **Dashboard stat cards mislabeled** — the sessions count was labeled
  "attendance", groups "staff", programs "schedule" in both locales.
  Cards now name what they count. The role card printed the raw enum
  (`group_supervisor`) and an "RLS policies" implementation note at
  end users; it now shows the localized `ROLE_LABELS` name and a
  user-appropriate hint.
- **Marketing hero eyebrow** hardcoded "— قطر · 2017" into the EN page;
  now `home.heroEyebrow` (AR uses Arabic-Indic ٢٠١٧).
- **Touch targets** — native checkboxes 13→18px with brand
  accent-color (one base rule in globals.css); attendance status pills
  24→44px and WhatsApp contact 28→40px (see commit for why the
  attendance page only became auditable this phase); auth footer
  links, roster/registration links, desktop nav links padded.

## Found by the audit, fixed at the database (RLS)

Runtime auditing with real role sessions surfaced three authorization
defects — details in the 0013/0014 migration headers:

1. **Group staff were blind to sessions** (`is_program_staff`-only
   read policy) — attendance/live/next-event could never find today's
   session for a group supervisor. → 0013, `staff_program_ids()`.
2. **Families could read unpublished session drafts** (and their
   stations); the schedule page filtered client-side only. → 0013,
   `published_at` required on family read paths.
3. **Staff could not release pickups** — the only write policy on
   `pickup_status` was `parent_id = auth.uid()`; the release button
   was a silent 0-row UPDATE. → 0014.

## Realtime: closed the Phase 2 open item

The two-browser test (`scripts/pickup-realtime-test.mjs`) proved the
"harness auth-wiring" theory wrong — the app itself never forwarded
the user JWT to the realtime socket (login is a server action, so the
browser only emits INITIAL_SESSION, which supabase-js does not
propagate). All RLS-gated subscriptions joined as anon and were
rejected. Fixed by awaiting `realtime.setAuth()` before subscribing;
full live loop now proven through the real UI:

- parent taps «أنا عند البوابة» → supervisor queue updates in ~257 ms
  (INSERT, with the child's name resolved)
- supervisor taps «تم التسليم» → parent flips to «تم تسليم الطفل» in
  ~511 ms (filtered UPDATE — exercising 0012 replica identity)

## Deliberately left as-is

- Staff dashboard pages are Arabic-first with bilingual headers
  («المجموعات — Groups») by design — not localization gaps.
- Latin digits in dashboard counters (values), Arabic-Indic numerals
  in marketing/attendance dates — consistent within each surface.
- `QAR 0` currency order on the payments page — correct LTR embed.
- Directional arrows «←» on Arabic-first staff links point forward in
  RTL, correct; revisit only if those surfaces are ever localized.

## Still pending (later phases)

- Storage signed URLs, magic-link email application path (mailpit),
  substitute-token route — live verification queued for Phase 4–5.
- [WAIT-MIGRATION] role-model items per docs/role-model-impact-analysis.md.
