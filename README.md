# لِ.قات — Le.Qat · Life Engineer Program Platform

منصة برنامج مهندس الحياة التربوي — قطر. Responsive, Arabic-primary (RTL),
installable PWA built with Next.js + Supabase.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind (RTL)
- **next-intl** — Arabic default, English toggle
- **Supabase** — Postgres + Auth + Realtime + Storage + **RLS**
- **TanStack Query** + Zustand · PWA offline shell

## Quick start

```bash
cp .env.example .env.local      # fill Supabase keys
npm install

# Database (requires Supabase CLI)
supabase start                  # local stack
supabase db reset               # runs migrations + seed.sql

npm run dev                     # http://localhost:3000
```

## Test accounts

Password for all: `Leqat@2025`

| Email | Role |
|---|---|
| exec@leqat.qa | Executive Supervisor |
| psup@leqat.qa | Program Supervisor |
| pmgr@leqat.qa | Program Manager |
| gsup@leqat.qa | Group Supervisor |
| asup@leqat.qa | Assistant Supervisor |
| parent@leqat.qa | Parent |
| student@leqat.qa | Student |

## Project layout

```
src/app/[locale]/            localized routes (marketing + auth + dashboard)
src/components/              UI + feature components
src/lib/supabase/            client / server / middleware
src/messages/{ar,en}.json    translations (AR required)
supabase/migrations/         0001_schema.sql · 0002_rls.sql
supabase/seed.sql            one realistic semester + 7 test roles
docs/admin-guide.md          AR + EN admin guide
```

## Features (v1)

Attendance + reports · in-app WhatsApp-style chat · digital books ·
group photo/video gallery with per-child consent · program scheduling
+ stations (محطات) · payments + registration · public marketing site.

Role-based access is enforced **server-side via Supabase RLS**
(`supabase/migrations/0002_rls.sql`), never trusted from the client.

## Deploy

See `docs/deploy.md` (Vercel + Supabase).

## Status / scope notes

This is a complete, deployable foundation: full schema + RLS + seed,
marketing site, auth, all seven role dashboards, and working
attendance (offline-queued) and realtime chat. Books reader, media
upload pipeline, payment-gateway webhooks, and FCM push are wired
structurally and documented as the next integration steps.
