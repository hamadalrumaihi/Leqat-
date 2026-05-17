-- ════════════════════════════════════════════════════════════════
--  0002_rls.sql — Row-Level Security
--  Role-based access is enforced here, never trusted from the client.
--  Parents can never see other kids' private notes or other groups'
--  content.
-- ════════════════════════════════════════════════════════════════

-- ── Helper functions (security definer to avoid RLS recursion) ──
create or replace function auth_role()
returns app_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_executive()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'executive' from profiles where id = auth.uid()), false);
$$;

create or replace function is_program_staff(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_executive()
      or exists (select 1 from program_staff where program_id = p and profile_id = auth.uid());
$$;

create or replace function is_group_staff(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_executive()
      or exists (select 1 from group_staff gs where gs.group_id = g and gs.profile_id = auth.uid())
      or exists (
        select 1 from groups gr
        join program_staff ps on ps.program_id = gr.program_id
        where gr.id = g and ps.profile_id = auth.uid()
      );
$$;

create or replace function is_parent_of(s uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from students where id = s and parent_id = auth.uid());
$$;

-- Group IDs a parent can see (their child's groups only).
create or replace function parent_group_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct e.group_id
  from enrollments e
  join students st on st.id = e.student_id
  where st.parent_id = auth.uid() and e.group_id is not null;
$$;

-- Group IDs a student can see (their own groups).
create or replace function student_group_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct e.group_id
  from enrollments e
  join students st on st.id = e.student_id
  where st.profile_id = auth.uid() and e.group_id is not null;
$$;

-- ── Enable RLS everywhere ───────────────────────────────────────
alter table profiles            enable row level security;
alter table programs            enable row level security;
alter table program_staff       enable row level security;
alter table groups              enable row level security;
alter table group_staff         enable row level security;
alter table students            enable row level security;
alter table enrollments         enable row level security;
alter table sessions            enable row level security;
alter table stations            enable row level security;
alter table attendance          enable row level security;
alter table reports             enable row level security;
alter table report_child_notes  enable row level security;
alter table books               enable row level security;
alter table book_assignments    enable row level security;
alter table reading_progress    enable row level security;
alter table chat_channels       enable row level security;
alter table chat_members        enable row level security;
alter table chat_messages       enable row level security;
alter table message_reactions   enable row level security;
alter table message_reads       enable row level security;
alter table pickup_status       enable row level security;
alter table gallery_albums      enable row level security;
alter table gallery_media       enable row level security;
alter table payments            enable row level security;
alter table consents            enable row level security;
alter table audit_log           enable row level security;

-- ── Profiles ────────────────────────────────────────────────────
create policy "own profile read" on profiles for select using (id = auth.uid() or is_executive());
create policy "own profile update" on profiles for update using (id = auth.uid());
create policy "exec manage profiles" on profiles for all using (is_executive()) with check (is_executive());

-- ── Programs (public can read open programs for the marketing site)
create policy "public read open programs" on programs for select
  using (status = 'open' or is_program_staff(id));
create policy "exec write programs" on programs for all
  using (is_executive()) with check (is_executive());
create policy "prog supervisor update" on programs for update
  using (is_program_staff(id)) with check (is_program_staff(id));

create policy "staff read program_staff" on program_staff for select
  using (is_program_staff(program_id) or profile_id = auth.uid());
create policy "exec write program_staff" on program_staff for all
  using (is_program_staff(program_id)) with check (is_program_staff(program_id));

-- ── Groups ──────────────────────────────────────────────────────
create policy "read groups" on groups for select using (
  is_program_staff(program_id)
  or id in (select parent_group_ids())
  or id in (select student_group_ids())
);
create policy "staff write groups" on groups for all
  using (is_program_staff(program_id)) with check (is_program_staff(program_id));

create policy "read group_staff" on group_staff for select using (is_group_staff(group_id) or profile_id = auth.uid());
create policy "write group_staff" on group_staff for all using (is_group_staff(group_id)) with check (is_group_staff(group_id));

-- ── Students (PII) ──────────────────────────────────────────────
create policy "parent reads own children" on students for select
  using (parent_id = auth.uid() or profile_id = auth.uid()
         or exists (select 1 from enrollments e where e.student_id = students.id and is_group_staff(e.group_id)));
create policy "parent writes own children" on students for all
  using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy "exec manage students" on students for all using (is_executive()) with check (is_executive());

-- ── Enrollments ─────────────────────────────────────────────────
create policy "read enrollments" on enrollments for select using (
  is_parent_of(student_id) or is_program_staff(program_id) or is_group_staff(group_id)
);
create policy "parent creates enrollment" on enrollments for insert
  with check (is_parent_of(student_id));
create policy "staff manage enrollments" on enrollments for all
  using (is_program_staff(program_id)) with check (is_program_staff(program_id));

-- ── Sessions & stations ─────────────────────────────────────────
create policy "read sessions" on sessions for select using (
  is_program_staff(program_id)
  or group_id in (select parent_group_ids())
  or group_id in (select student_group_ids())
);
create policy "staff write sessions" on sessions for all
  using (is_program_staff(program_id)) with check (is_program_staff(program_id));

create policy "read stations" on stations for select using (
  (program_id is not null and is_program_staff(program_id))
  or exists (select 1 from sessions s where s.id = stations.session_id
             and (is_program_staff(s.program_id)
                  or s.group_id in (select parent_group_ids())
                  or s.group_id in (select student_group_ids())))
);
create policy "staff write stations" on stations for all using (
  (program_id is not null and is_program_staff(program_id))
  or exists (select 1 from sessions s where s.id = stations.session_id and is_program_staff(s.program_id))
) with check (true);

-- ── Attendance ──────────────────────────────────────────────────
create policy "read attendance" on attendance for select using (
  exists (select 1 from sessions s where s.id = attendance.session_id and is_group_staff(s.group_id))
  or is_parent_of(student_id)
  or exists (select 1 from students st where st.id = attendance.student_id and st.profile_id = auth.uid())
);
create policy "staff write attendance" on attendance for all using (
  exists (select 1 from sessions s where s.id = attendance.session_id and is_group_staff(s.group_id))
) with check (
  exists (select 1 from sessions s where s.id = attendance.session_id and is_group_staff(s.group_id))
);

-- ── Reports ─────────────────────────────────────────────────────
create policy "read reports" on reports for select using (
  is_group_staff(group_id) or group_id in (select parent_group_ids())
);
create policy "staff write reports" on reports for all
  using (is_group_staff(group_id)) with check (is_group_staff(group_id));

-- Private per-child notes: only that child's parent + staff above.
create policy "read child notes" on report_child_notes for select using (
  is_parent_of(student_id)
  or exists (select 1 from reports r where r.id = report_child_notes.report_id and is_group_staff(r.group_id))
);
create policy "staff write child notes" on report_child_notes for all using (
  exists (select 1 from reports r where r.id = report_child_notes.report_id and is_group_staff(r.group_id))
) with check (
  exists (select 1 from reports r where r.id = report_child_notes.report_id and is_group_staff(r.group_id))
);

-- ── Books ───────────────────────────────────────────────────────
create policy "read books" on books for select using (auth.uid() is not null);
create policy "exec write books" on books for all using (is_executive()) with check (is_executive());

create policy "read book_assignments" on book_assignments for select using (
  is_group_staff(group_id) or group_id in (select parent_group_ids()) or group_id in (select student_group_ids())
);
create policy "staff write book_assignments" on book_assignments for all
  using (is_group_staff(group_id)) with check (is_group_staff(group_id));

create policy "read reading_progress" on reading_progress for select using (
  is_parent_of(student_id)
  or exists (select 1 from students st where st.id = reading_progress.student_id and st.profile_id = auth.uid())
  or exists (select 1 from enrollments e where e.student_id = reading_progress.student_id and is_group_staff(e.group_id))
);
create policy "student writes own progress" on reading_progress for all using (
  exists (select 1 from students st where st.id = reading_progress.student_id and st.profile_id = auth.uid())
) with check (
  exists (select 1 from students st where st.id = reading_progress.student_id and st.profile_id = auth.uid())
);

-- ── Chat ────────────────────────────────────────────────────────
create policy "read channels" on chat_channels for select using (
  exists (select 1 from chat_members m where m.channel_id = chat_channels.id and m.profile_id = auth.uid())
  or (group_id is not null and is_group_staff(group_id))
);
create policy "staff write channels" on chat_channels for all using (
  group_id is null or is_group_staff(group_id)
) with check (true);

create policy "read members" on chat_members for select using (
  profile_id = auth.uid()
  or exists (select 1 from chat_channels c where c.id = chat_members.channel_id and c.group_id is not null and is_group_staff(c.group_id))
);
create policy "self or staff member rows" on chat_members for all using (
  profile_id = auth.uid()
  or exists (select 1 from chat_channels c where c.id = chat_members.channel_id and c.group_id is not null and is_group_staff(c.group_id))
) with check (true);

create policy "read messages" on chat_messages for select using (
  exists (select 1 from chat_members m where m.channel_id = chat_messages.channel_id and m.profile_id = auth.uid())
);
create policy "member sends message" on chat_messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from chat_members m where m.channel_id = chat_messages.channel_id and m.profile_id = auth.uid())
);
create policy "staff moderates messages" on chat_messages for update using (
  exists (select 1 from chat_channels c where c.id = chat_messages.channel_id and c.group_id is not null and is_group_staff(c.group_id))
) with check (true);

create policy "reactions in my channels" on message_reactions for all using (
  exists (select 1 from chat_messages msg join chat_members mem on mem.channel_id = msg.channel_id
          where msg.id = message_reactions.message_id and mem.profile_id = auth.uid())
) with check (profile_id = auth.uid());

create policy "reads in my channels" on message_reads for all using (
  profile_id = auth.uid()
) with check (profile_id = auth.uid());

create policy "read pickup" on pickup_status for select using (
  parent_id = auth.uid()
  or exists (select 1 from sessions s where s.id = pickup_status.session_id and is_group_staff(s.group_id))
);
create policy "parent sets pickup" on pickup_status for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- ── Gallery (consent enforced in app + here) ────────────────────
create policy "read albums" on gallery_albums for select using (
  is_group_staff(group_id) or group_id in (select parent_group_ids()) or group_id in (select student_group_ids())
);
create policy "staff write albums" on gallery_albums for all
  using (is_group_staff(group_id)) with check (is_group_staff(group_id));

create policy "read media" on gallery_media for select using (
  is_group_staff(group_id) or group_id in (select parent_group_ids()) or group_id in (select student_group_ids())
);
create policy "staff write media" on gallery_media for all
  using (is_group_staff(group_id)) with check (is_group_staff(group_id));

-- ── Payments & consent ──────────────────────────────────────────
create policy "parent reads own payments" on payments for select using (parent_id = auth.uid() or is_executive());
create policy "parent creates payment" on payments for insert with check (parent_id = auth.uid());
create policy "exec manages payments" on payments for all using (is_executive()) with check (is_executive());

create policy "read consents" on consents for select using (
  parent_id = auth.uid()
  or exists (select 1 from enrollments e where e.student_id = consents.student_id and is_group_staff(e.group_id))
);
create policy "parent writes consent" on consents for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- ── Audit log: executives read; anyone authenticated can append ─
create policy "exec reads audit" on audit_log for select using (is_executive());
create policy "append audit" on audit_log for insert with check (actor_id = auth.uid());
