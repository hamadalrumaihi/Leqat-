-- ════════════════════════════════════════════════════════════════
--  0025_issues.sql — Operations Platform, Phase E.
--
--  Staff report operational issues from the floor; management triages,
--  prioritises, assigns, and resolves them. Additive, forward-only.
-- ════════════════════════════════════════════════════════════════

create type issue_kind as enum (
  'missing_participant','attendance','teacher_delay','room_conflict',
  'missing_materials','activity_delay','safety','technical',
  'transportation','other'
);
create type issue_priority as enum ('low','normal','high','urgent');
create type issue_status   as enum ('new','acknowledged','in_progress','resolved');

create table issues (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid references programs(id) on delete cascade,
  group_id     uuid references groups(id) on delete set null,
  reporter_id  uuid references profiles(id) on delete set null,
  kind         issue_kind not null default 'other',
  location_ar  text,
  description_ar text not null,
  priority     issue_priority not null default 'normal',
  status       issue_status not null default 'new',
  assigned_to  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index issues_open_idx    on issues (status) where status <> 'resolved';
create index issues_program_idx on issues (program_id, created_at desc);

alter table issues enable row level security;

-- Any staff member may report an issue (as themselves).
create policy "staff report issues" on issues for insert
  with check (is_staff_user() and reporter_id = auth.uid());

-- Read: management sees everything; a reporter sees their own; the
-- group's staff see their group's issues; the assignee sees theirs.
create policy "read issues" on issues for select using (
  is_management()
  or reporter_id = auth.uid()
  or (group_id is not null and is_group_staff(group_id))
  or assigned_to = auth.uid()
);

-- Triage (status / priority / assignment / resolution) is management's.
create policy "management triages issues" on issues for update
  using (is_management()) with check (is_management());
create policy "management deletes issues" on issues for delete
  using (is_management());

grant select, insert, update, delete on issues to authenticated, service_role;
