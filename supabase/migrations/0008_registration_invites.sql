-- ════════════════════════════════════════════════════════════════
--  0008_registration_invites.sql
--  Single-use invite tokens for WhatsApp registration.
--  Staff generates → sends link → parent fills form → token consumed.
-- ════════════════════════════════════════════════════════════════

create table if not exists registration_invites (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,                    -- 32-char url-safe
  program_id    uuid references programs(id) on delete cascade,
  created_by    uuid not null references profiles(id) on delete cascade,
  parent_name_hint  text,
  parent_phone_hint text,
  notes         text,
  expires_at    timestamptz not null default (now() + interval '14 days'),
  consumed_at   timestamptz,
  consumed_by_profile_id uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create index if not exists registration_invites_token_idx
  on registration_invites (token) where consumed_at is null;
create index if not exists registration_invites_program_idx
  on registration_invites (program_id, created_at);

alter table registration_invites enable row level security;

-- Staff with access to the program can create + read invites for it;
-- executives can do everything. Parents never touch this table — the
-- public registration flow uses the service-role helper.
create policy "staff manages invites" on registration_invites for all
  using (is_executive() or (program_id is not null and is_program_staff(program_id)))
  with check (is_executive() or (program_id is not null and is_program_staff(program_id)));
