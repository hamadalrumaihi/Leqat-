-- ════════════════════════════════════════════════════════════════
--  0027_notifications.sql — in-app notification center.
--
--  System-generated notifications delivered to a recipient, with a
--  read state and realtime delivery. Rows are created server-side by
--  trusted actions (announcement fan-out, issue assignment) via the
--  service-role client; recipients read and mark their own read.
--  Additive, forward-only.
-- ════════════════════════════════════════════════════════════════

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  kind         text not null default 'general',
  title_ar     text not null,
  body_ar      text,
  href         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_recipient_idx on notifications (recipient_id, created_at desc);
create index notifications_unread_idx    on notifications (recipient_id) where read_at is null;

alter table notifications enable row level security;

-- A recipient reads and marks read ONLY their own notifications. There
-- is deliberately no user INSERT policy — rows are produced server-side
-- with the service-role client after an authorization check.
create policy "read own notifications" on notifications for select
  using (recipient_id = auth.uid());
create policy "update own notifications" on notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

grant select, insert, update, delete on notifications to authenticated, service_role;

-- Realtime: a live unread counter needs the insert stream. REPLICA
-- IDENTITY FULL so the mark-read UPDATE carries the row.
alter table notifications replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
