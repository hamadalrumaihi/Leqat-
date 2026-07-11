# Deployment — Vercel + Supabase

## 1. Supabase project

```bash
npm i -g supabase
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

supabase db push    # applies supabase/migrations/* in order (0001–0014)
```

The migrations are self-contained and **forward-only**: schema + RLS
(0001–0004), private Storage buckets + object policies (0005), API
grants (0009 — without it every PostgREST request fails), staff
visibility helpers (0010), integrity guards (0011), Realtime
publication + replica identity (0012 — without it no live feature
fires), session visibility (0013), pickup release (0014).

> **Do not apply `supabase/seed.sql` to production.** It creates demo
> accounts with a published password. It is for local stacks and
> previews only.

### Auth configuration (Supabase dashboard → Authentication → URL)

- **Site URL** = `https://<your-domain>`
- **Redirect URLs** must include `https://<your-domain>/auth/callback`
  — magic-link login and registration links land there for the PKCE
  exchange; without the allowlist entry GoTrue silently falls back to
  the Site URL and login completes nowhere.

## 2. Vercel

```bash
npm i -g vercel
vercel link
vercel --prod
```

Set env vars in the Vercel dashboard (see `.env.example` for the full
annotated list):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | build-time inlined — redeploy after changing |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | build-time inlined |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **server only**, never exposed to the client |
| `NEXT_PUBLIC_SITE_URL` | yes | canonical origin; used in emailed links |
| `SUBSTITUTE_LINK_SECRET` | for substitute links | unset = feature disabled (button reports not_configured) |
| `RESEND_API_KEY` / `EMAIL_FROM` / `CRON_SECRET` | for weekly digest | unset = digest stub mode (logs, no send) |
| `PAYMENT_PROVIDER` + gateway keys | keep `sandbox` for v1 | WhatsApp-led payments; gateway integration is dormant |
| `AI_API_KEY` / `AI_MODEL` | optional | report assistant falls back to a deterministic template |

## 3. Post-deploy

Run the smoke tests in `docs/release-checklist.md`. CI
(`.github/workflows/ci.yml`) already gates lint, typecheck, build, and
a full `supabase db reset` migration-chain validation on every push.
