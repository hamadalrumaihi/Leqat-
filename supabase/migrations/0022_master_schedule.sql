-- ════════════════════════════════════════════════════════════════
--  0022_master_schedule.sql — Operations Platform, Phase B.
--
--  The master schedule links, for a slot in time: a group, an approved
--  executive activity, a specialist teacher, and a room. It is the
--  staff operations plan (distinct from the family-facing sessions/
--  stations view). Conflict detection runs in the app over these rows
--  before publishing.
--
--  Additive; forward-only. No existing table/policy is changed.
-- ════════════════════════════════════════════════════════════════

-- Execution lifecycle of a scheduled activity (the transition UI lands
-- in a later phase; entries default to 'scheduled').
create type schedule_exec_status as enum
  ('scheduled','ready','in_progress','completed','delayed','cancelled','moved');

create table schedule_entries (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references programs(id) on delete cascade,
  group_id     uuid not null references groups(id) on delete cascade,
  activity_id  uuid references activities(id) on delete set null,
  teacher_id   uuid references profiles(id) on delete set null,   -- specialist teacher
  room_id      uuid references rooms(id) on delete set null,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  notes_ar     text,
  exec_status  schedule_exec_status not null default 'scheduled',
  published_at timestamptz,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint schedule_entries_time_order check (end_time > start_time)
);
create index schedule_entries_prog_date_idx on schedule_entries (program_id, date);
create index schedule_entries_group_idx     on schedule_entries (group_id, date);
create index schedule_entries_teacher_idx   on schedule_entries (teacher_id, date);

alter table schedule_entries enable row level security;

-- Read: management sees all; group staff see their group's schedule; a
-- specialist teacher sees the entries assigned to them. (No family
-- access — this is the ops schedule, not the published family view.)
create policy "read schedule entries" on schedule_entries for select using (
  is_management()
  or is_group_staff(group_id)
  or teacher_id = auth.uid()
);
-- Write: management, or program staff of the entry's program.
create policy "management writes schedule" on schedule_entries for all
  using (is_management() or is_program_staff(program_id))
  with check (is_management() or is_program_staff(program_id));

grant select, insert, update, delete on schedule_entries to authenticated, service_role;

-- ── Supporting read access for the ops schedule ─────────────────
-- Any staff member may read group metadata (name/color/division — not
-- PII), so specialist teachers and assistants can see the group a
-- schedule entry belongs to. Additive to the existing "read groups".
create policy "staff read groups" on groups for select using (is_staff_user());

-- Management may read staff profiles (to populate teacher / manager
-- pickers). Row filter keeps it to staff rows — parent/student profiles
-- stay governed by the existing family-scoped policies.
create policy "management reads staff profiles" on profiles for select
  using (is_management() and role not in ('parent','student'));
