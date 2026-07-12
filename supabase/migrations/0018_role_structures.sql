-- ════════════════════════════════════════════════════════════════
--  0018_role_structures.sql — role model migration, step M-b:
--  founder authority + shifts + divisions + assistant assignments.
--
--  Runs in its own transaction AFTER 0017 committed the enum values,
--  so 'founder'/'manager' are usable here. All additive; legacy roles
--  and existing rows are untouched.
-- ════════════════════════════════════════════════════════════════

-- ── Founder authority ───────────────────────────────────────────
-- Founder sits above Executive and must hold ≥ Executive power. The
-- cheapest correct change (per the impact analysis §2.2): is_executive()
-- now means "executive-level authority or above", covering founder.
-- Every one of the ~15 policies that call is_executive() thereby grants
-- founder the same access — no policy edits needed.
create or replace function is_executive() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('executive','founder') from profiles where id = auth.uid()),
    false);
$$;

create or replace function is_founder() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'founder' from profiles where id = auth.uid()), false);
$$;

-- ── Manager shifts (morning / afternoon / both) ─────────────────
-- A "Morning Manager" and "Afternoon Manager" are the SAME role with a
-- different shift value and identical authority — the shift is an
-- operational filter, never a security boundary.
create type shift_t as enum ('morning','afternoon','both');

create table manager_shifts (
  program_id uuid not null references programs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  shift      shift_t not null default 'both',
  primary key (program_id, profile_id)
);
alter table manager_shifts enable row level security;

-- Any staff of the program can SEE who runs which shift; only
-- management (executive/founder) assigns shifts.
create policy "program staff read shifts" on manager_shifts for select
  using (is_program_staff(program_id));
create policy "management writes shifts" on manager_shifts for all
  using (is_executive()) with check (is_executive());

-- ── Age divisions (younger / teen) ──────────────────────────────
create type division_t as enum ('younger','teen');
alter table groups add column if not exists division division_t;
-- Nullable: existing groups have no division until set. No constraint
-- ties division to size — group size is a soft UI warning, not a rule.

-- ── Assistant session assignments (group vs station) ────────────
-- One global assistant_supervisor role is retained; whether an
-- assistant helps the whole group or a single station is per-session
-- DATA, not a second role (permission audit: same read/write surface).
create type assistant_kind as enum ('group_assistant','station_assistant');

create table session_assistant_assignments (
  session_id uuid not null references sessions(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  kind       assistant_kind not null,
  station_id uuid references stations(id) on delete set null,
  primary key (session_id, profile_id)
);
alter table session_assistant_assignments enable row level security;

-- Group staff of the session's group read and manage its assistant
-- assignments. session_group_id() is SECURITY DEFINER so evaluating
-- this policy never re-enters sessions RLS.
create or replace function session_group_id(sid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from sessions where id = sid;
$$;

create policy "group staff read assistant assignments"
  on session_assistant_assignments for select
  using (is_group_staff(session_group_id(session_id)));
create policy "group staff manage assistant assignments"
  on session_assistant_assignments for all
  using (is_group_staff(session_group_id(session_id)))
  with check (is_group_staff(session_group_id(session_id)));

-- ── Grants (explicit; do not rely on default privileges) ────────
grant select, insert, update, delete on manager_shifts, session_assistant_assignments
  to authenticated, service_role;
grant execute on function is_founder(), session_group_id(uuid)
  to anon, authenticated, service_role;
