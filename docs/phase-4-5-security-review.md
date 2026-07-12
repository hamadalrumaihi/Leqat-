# Phase 4–5 — operational verification + security review

## Live-verified paths (previously unproven)

Each ran against the local Supabase stack (migrations 0001–0016 + seed)
with the production Next build. Harnesses are in `scripts/`.

| Path | Harness | Result |
|---|---|---|
| Magic-link login (email → verify → PKCE callback → dashboard) | `magic-link-test.mjs` | ✅ fixed + green |
| Substitute link (generate → unauth read-only view → tampered token rejected) | `substitute-test.mjs` | ✅ 6/6 |
| Storage signed URLs (upload → sign → fetch bytes; anon/cross-group denied) | `storage-test.mjs` | ✅ 8/8 |
| Realtime pickup (two browsers) | `pickup-realtime-test.mjs` | ✅ ~257ms / ~511ms |
| Needs-attention strip (per-role, RLS-scoped) | live per role | ✅ gsup/exec scoped, parent none |

## Magic-link fix (was completely broken)

`signInWithOtp` redirected to `/ar/dashboard`, but no route exchanged
the `?code=` for a session, so the default login method always bounced
to `/login`. Added `/auth/callback` (PKCE `exchangeCodeForSession`),
excluded from the i18n matcher, `next` restricted to same-origin
relative paths, relative-Location redirect to keep session cookies on
the arrival host. Production must allowlist `/auth/callback` in Supabase
Auth redirect URLs (in `docs/deploy.md`).

## Security review — findings and dispositions

A three-stage review (identify → parallel adversarial false-positive
filtering → apply) over the whole branch diff. Three findings survived;
all fixed and re-verified.

1. **LIKE injection → cross-account profile overwrite (High, fixed).**
   `findParentIdByEmail` used `.ilike('email', email)` with the raw
   registration email; `%`/`_` are wildcards, so a crafted
   `parent_email=%@%` matched an arbitrary existing profile that
   `completeRedemption` then overwrote via the service-role client —
   corrupting PII and force-downgrading a staff/exec victim's role.
   Fix: exact `.eq` match; never overwrite an existing profile's role
   on redeem. (commit `ce11976`)

2. **Chat co-member PII exposure (High for this platform, fixed).**
   0010's `channel co-members read profiles` policy granted whole-row
   SELECT — Postgres RLS is row-level — so any channel member could
   read every co-member's `email`/`phone` via PostgREST. Group channels
   are multi-parent, so one family could harvest others' contact info.
   Fix (0015): drop the whole-row policy; expose names only through
   `channel_peer_directory()` (SECURITY DEFINER, id + names). Staff's
   legitimate `is_staff_for_parent` phone access is untouched.
   (commit `6d7f7d7`)

3. **Open redirect via `next=/\host` (Low, hardened).**
   Below the reporting bar (requires a valid PKCE code and `next` is
   fixed server-side in the real flow) but the one-line guard now
   rejects the backslash variant too. (commit `ce11976`)

### Found while verifying #2 — chat RLS recursion (deploy-blocking, fixed)

The `chat_channels`/`chat_members` 0002 policies reference each other's
table, so evaluating either recurses (`42P17`) and the **entire chat
feature is dead** on a real deploy — every role saw "no channels".
Latent because chat was never run against a live DB before. Fixed
(0016) with SECURITY DEFINER helpers that break the cross-table
references; authorization intent unchanged, verified live.

### Areas examined and cleared

0009 blanket grants (all tables RLS-enabled, default-deny backstop);
SECURITY DEFINER helpers (stable, pinned `search_path`, uuid args, no
dynamic SQL); `update_parent_phone` RPC (correctly gated); 0013/0014
policies (USING+WITH CHECK re-scope, no cross-group writes); realtime
`setAuth` (forwards existing JWT, RLS still governs); `roles.ts`
(narrows or matches prior arrays, no capability gained); middleware
`auth` exclusion (only the self-authenticating callback).

## Chat smoke step (added to release checklist)

After deploy, open the chat page as a parent and as a supervisor:
channels must list (not "no channels"), a posted message must show the
sender's name, and — the negative — a parent must NOT be able to read
another member's email/phone via the API.
