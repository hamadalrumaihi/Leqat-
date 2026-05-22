-- ════════════════════════════════════════════════════════════════
--  0006_program_reality.sql
--  Aligns the schema with how the program actually runs. Additive
--  only — no existing column/policy is dropped. Built from the UI
--  brief's data contracts.
-- ════════════════════════════════════════════════════════════════

-- ── §2 Planner role ─────────────────────────────────────────────
alter type app_role add value if not exists 'program_planner';

-- ── §11 Program-wide channel + parent write-lock ────────────────
alter type channel_type add value if not exists 'program';
alter table chat_channels
  add column if not exists parents_can_post boolean not null default false;

-- ── §13 WhatsApp-confirmed payments ─────────────────────────────
alter type payment_status add value if not exists 'whatsapp_confirmed';
alter table payments add column if not exists confirmed_by uuid references profiles(id);
alter table payments add column if not exists confirmed_at timestamptz;
alter table payments add column if not exists note text;

-- ── §3 Group color ──────────────────────────────────────────────
alter table groups add column if not exists color text;  -- '#RRGGBB'

-- ── §4 / §5 Session times + publish workflow ────────────────────
alter table sessions add column if not exists start_time time;
alter table sessions add column if not exists end_time time;
alter table sessions add column if not exists published_at timestamptz;
alter table sessions add column if not exists published_by uuid references profiles(id);

-- ── §6 Stations: REPEAT letter, prayer flag, secondary quotients ─
do $$ begin
  create type repeat_letter_t as enum ('R','E1','P','E2','A','T');
exception when duplicate_object then null; end $$;

alter table stations add column if not exists repeat_letter repeat_letter_t;
alter table stations add column if not exists is_prayer boolean not null default false;
alter table stations add column if not exists secondary_quotients quotient_t[] not null default '{}';

-- ── §8 Books: kind + program link + workbook progress ───────────
do $$ begin
  create type book_kind as enum ('publication','workbook','audio');
exception when duplicate_object then null; end $$;

alter table books add column if not exists kind book_kind not null default 'publication';
alter table books add column if not exists program_id uuid references programs(id) on delete set null;
update books set kind = (case when type = 'audio' then 'audio' else 'publication' end)::book_kind;

create table if not exists group_workbook_progress (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete cascade,
  book_id      uuid not null references books(id) on delete cascade,
  current_page int not null default 0,
  last_section text,
  updated_at   timestamptz not null default now(),
  unique (group_id, book_id)
);

-- ── §9 Pickup "at the gate" ─────────────────────────────────────
alter table pickup_status add column if not exists arrived_at timestamptz;
alter table pickup_status add column if not exists picked_up_by_name text;
alter table pickup_status add column if not exists picked_up_by_phone text;

-- ── §10 Authorized pickup persons ───────────────────────────────
create table if not exists authorized_pickup_persons (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  parent_id  uuid not null references profiles(id) on delete cascade,
  name       text not null,
  phone      text,
  relation   text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── §7 Quotient → value auto-fill (editable) ────────────────────
create or replace function fill_program_value()
returns trigger language plpgsql as $$
begin
  if new.quotient is not null and (new.value_ar is null or new.value_ar = '') then
    new.value_ar := case new.quotient
      when 'SQ' then 'الإحسان' when 'EQ' then 'الانضباط الذاتي'
      when 'IQ' then 'التعلّم'  when 'PQ' then 'الصحة' end;
    new.value_en := case new.quotient
      when 'SQ' then 'Ihsan' when 'EQ' then 'Self-discipline'
      when 'IQ' then 'Learning' when 'PQ' then 'Health' end;
  end if;
  return new;
end; $$;

drop trigger if exists program_value_autofill on programs;
create trigger program_value_autofill
  before insert or update on programs
  for each row execute function fill_program_value();

-- ── §12 Consent withdrawal → retroactive blur ───────────────────
-- A child's photos must vanish from group-visible posts the moment a
-- parent withdraws consent. Media is not per-child tagged, so we blur
-- the child's whole group conservatively.
create or replace function blur_on_consent_withdrawal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.withdrawn_at is not null or new.photo_consent = false then
    update gallery_media gm set blurred = true
    where gm.group_id in (
      select e.group_id from enrollments e
      where e.student_id = new.student_id and e.group_id is not null
    );
  end if;
  return new;
end; $$;

drop trigger if exists consent_blur on consents;
create trigger consent_blur
  after insert or update on consents
  for each row execute function blur_on_consent_withdrawal();

-- ── RLS for new tables ──────────────────────────────────────────
alter table group_workbook_progress  enable row level security;
alter table authorized_pickup_persons enable row level security;

create policy "read workbook progress" on group_workbook_progress for select using (
  is_group_staff(group_id)
  or group_id in (select parent_group_ids())
  or group_id in (select student_group_ids())
);
create policy "staff write workbook progress" on group_workbook_progress for all
  using (is_group_staff(group_id)) with check (is_group_staff(group_id));

create policy "parent manages authorized persons" on authorized_pickup_persons for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid() and is_parent_of(student_id));
create policy "staff read authorized persons" on authorized_pickup_persons for select using (
  parent_id = auth.uid()
  or exists (
    select 1 from enrollments e
    where e.student_id = authorized_pickup_persons.student_id and is_group_staff(e.group_id)
  )
);
