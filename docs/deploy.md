# Deployment — Vercel + Supabase

## 1. Supabase project

```bash
npm i -g supabase
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# Apply schema + RLS, then seed
supabase db push                  # runs supabase/migrations/*
psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # or: supabase db reset (local)
```

Create Storage buckets (private):

```sql
insert into storage.buckets (id, name, public) values
  ('books','books',false),
  ('gallery','gallery',false),
  ('chat-media','chat-media',false)
on conflict do nothing;
```

Files are served via **signed URLs** only; books are watermarked with
the student's name (DRM-light).

## 2. Vercel

```bash
npm i -g vercel
vercel link
# Add env vars from .env.example in the Vercel dashboard
vercel --prod
```

Required env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, payment + FCM keys.

## 3. Post-deploy checklist

- [ ] Supabase Auth → Site URL = production domain
- [ ] Realtime enabled for `chat_messages`, `attendance`
- [ ] Payment webhook → `/api/payments/webhook` (Dibsy/MyFatoorah/Stripe)
- [ ] FCM web push VAPID key set
- [ ] Run `npm run typecheck && npm run build` in CI
