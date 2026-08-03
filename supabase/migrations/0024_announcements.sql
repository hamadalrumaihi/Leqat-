-- ════════════════════════════════════════════════════════════════
--  0024_announcements.sql — Operations Platform, Phase D.
--
--  Targeted operational announcements. Management publishes to an
--  audience; each staff member sees the announcements aimed at them.
--  Additive, forward-only.
-- ════════════════════════════════════════════════════════════════

create type announcement_audience as enum (
  'all_staff',           -- every staff member
  'executives',          -- founder + executive
  'managers',            -- the Manager tier (planning folded in)
  'group_supervisors',   -- all Group Managers
  'specialist_teachers', -- all specialist teachers
  'group',               -- one group's staff  (target_group_id)
  'teacher'              -- one specialist teacher (target_profile_id)
);

create table announcements (
  id                uuid primary key default gen_random_uuid(),
  program_id        uuid references programs(id) on delete cascade,
  title_ar          text not null,
  body_ar           text,
  audience          announcement_audience not null default 'all_staff',
  target_group_id   uuid references groups(id) on delete cascade,
  target_profile_id uuid references profiles(id) on delete cascade,
  created_by        uuid references profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index announcements_created_idx on announcements (created_at desc);

alter table announcements enable row level security;

-- A staff member sees an announcement when its audience includes them.
-- Management (and the author) always see everything they published.
-- 'specialist_teacher'/'group_supervisor'/'manager' are pre-existing
-- enum values, so referencing them here is safe.
create policy "read announcements" on announcements for select using (
  is_management()
  or created_by = auth.uid()
  or (audience = 'all_staff' and is_staff_user())
  or (audience = 'executives' and is_executive())
  or (audience = 'group_supervisors'
      and (select role from profiles where id = auth.uid()) = 'group_supervisor')
  or (audience = 'specialist_teachers'
      and (select role from profiles where id = auth.uid()) = 'specialist_teacher')
  or (audience = 'managers'
      and (select role from profiles where id = auth.uid())
          in ('manager','program_manager','program_supervisor','program_planner'))
  or (audience = 'group' and is_group_staff(target_group_id))
  or (audience = 'teacher' and target_profile_id = auth.uid())
);

-- Only management publishes / edits / deletes announcements.
create policy "management writes announcements" on announcements for all
  using (is_management()) with check (is_management());

grant select, insert, update, delete on announcements to authenticated, service_role;
