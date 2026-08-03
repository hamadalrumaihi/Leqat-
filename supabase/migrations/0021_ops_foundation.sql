-- ════════════════════════════════════════════════════════════════
--  0021_ops_foundation.sql — Operations Platform, Phase A foundation.
--
--  Adds the pieces the operations MVP builds on: the Specialist Teacher
--  role, a management helper, program operating details, a rooms table,
--  and the reusable Executive Activity Library with its approval
--  workflow. Additive and forward-only — no existing column/policy is
--  changed, and the parent-facing platform is untouched.
--
--  NOTE on the enum add: 'specialist_teacher' is added to app_role here
--  but is never REFERENCED (cast/compared) anywhere in this migration —
--  Postgres forbids using a newly-added enum value in the same
--  transaction. is_staff_user() is therefore defined by EXCLUSION
--  (not parent/student) rather than by listing staff roles.
-- ════════════════════════════════════════════════════════════════

-- 1. Specialist Teacher — delivers activities, moves between groups.
alter type app_role add value if not exists 'specialist_teacher';

-- 2. Authority helpers.
--    Management tier = founder / executive / manager (planning is folded
--    into Manager, so managers propose AND approve activities). Legacy
--    planner-tier aliases are included so historical accounts keep parity.
create or replace function is_management() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in
    ('founder','executive','manager','program_manager','program_supervisor','program_planner')
    from profiles where id = auth.uid()), false);
$$;

--    Any staff member (used for read-only visibility of ops reference
--    data). Defined by exclusion to avoid referencing the new enum value.
create or replace function is_staff_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role not in ('parent','student')
    from profiles where id = auth.uid()), false);
$$;

revoke all on function is_management(), is_staff_user() from public;
grant execute on function is_management(), is_staff_user()
  to anon, authenticated, service_role;

-- 3. Program operating details (nullable, additive). Status now spans the
--    fuller lifecycle draft|planning|registration_open|ready|active|
--    completed|archived; kept as text (legacy open|closed still render),
--    no enum lock-in.
alter table programs add column if not exists location_ar    text;
alter table programs add column if not exists location_en    text;
alter table programs add column if not exists operating_days int[];   -- 0=Sun … 6=Sat
alter table programs add column if not exists daily_start    time;
alter table programs add column if not exists daily_end      time;

-- 4. Rooms — physical activity locations, scoped to a program.
create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name_ar    text not null,
  name_en    text,
  capacity   int,
  notes_ar   text,
  created_at timestamptz not null default now()
);
create index if not exists rooms_program_idx on rooms (program_id);

alter table rooms enable row level security;
create policy "staff read rooms" on rooms for select using (is_staff_user());
create policy "management writes rooms" on rooms for all
  using (is_executive() or is_program_staff(program_id))
  with check (is_executive() or is_program_staff(program_id));

-- 5. Executive Activity Library — reusable, org-level, approval-gated.
create type activity_status as enum
  ('proposed','under_review','approved','needs_revision','rejected','archived');

create table if not exists activities (
  id                  uuid primary key default gen_random_uuid(),
  title_ar            text not null,
  title_en            text,
  category            text,
  objective_ar        text,
  description_ar      text,
  instructions_ar     text,
  duration_min        int not null default 45,
  age_grp             age_group,        -- suitable participant level
  materials_ar        text,
  prep_ar             text,
  max_group_size      int,
  safety_ar           text,
  suggested_room      uuid references rooms(id) on delete set null,
  recommended_teacher uuid references profiles(id) on delete set null,
  status              activity_status not null default 'proposed',
  proposed_by         uuid references profiles(id) on delete set null,
  reviewed_by         uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table activities enable row level security;
-- Every staff member sees APPROVED activities (the usable library);
-- management additionally sees proposals and everything in-flight.
-- The approved branch is staff-gated so the ops library never leaks to
-- parents/students.
create policy "staff read approved activities" on activities for select
  using ((status = 'approved' and is_staff_user()) or is_management());
-- Management proposes, edits, reviews and approves (planning folded in).
create policy "management writes activities" on activities for all
  using (is_management()) with check (is_management());

-- 6. Grants for the new tables (0009 pattern — explicit, not relying on
--    default privileges).
grant select, insert, update, delete on rooms to authenticated, service_role;
grant select, insert, update, delete on activities to authenticated, service_role;
