-- ════════════════════════════════════════════════════════════════
--  Le.Qat — Life Engineer Program Platform
--  0001_schema.sql — core schema
--  Every user-facing content object carries Arabic (required) and
--  English (optional) fields.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────
create type app_role as enum (
  'executive',          -- مشرف تنفيذي عام
  'program_supervisor', -- مشرف برنامج تنفيذي
  'program_manager',    -- مدير برنامج
  'group_supervisor',   -- مشرف مجموعة
  'assistant_supervisor',-- مشرف مساعد
  'parent',             -- ولي أمر
  'student'             -- طالب
);

create type age_group as enum (
  'baraem',      -- براعم 5–6
  'nashia',      -- ناشئة 7–9
  'fityan',      -- فتيان 10–14
  'shabab',      -- شباب 15–18 (boys)
  'university',  -- الجامعيين
  'parents'      -- الوالدين
);

create type gender_t as enum ('male', 'female', 'both');
create type program_type as enum ('daily', 'weekly');
create type quotient_t as enum ('SQ', 'EQ', 'IQ', 'PQ');
create type skill_t as enum ('critical', 'creative', 'collaboration', 'communication');
create type attendance_t as enum ('present', 'absent', 'late', 'excused');
create type enrollment_status as enum ('pending', 'active', 'waitlisted', 'refunded', 'cancelled');
create type report_stage as enum ('draft', 'submitted_manager', 'submitted_supervisor', 'submitted_executive', 'approved');
create type channel_type as enum ('group', 'dm');
create type media_type as enum ('image', 'video', 'voice');
create type moderation_t as enum ('pending', 'approved', 'rejected');
create type pickup_mode as enum ('self', 'driver', 'maid', 'delayed');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type book_type as enum ('book', 'audio');

-- ── Profiles (1:1 with auth.users) ──────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        app_role not null default 'parent',
  full_name_ar text not null,
  full_name_en text,
  email       text,
  phone       text,
  locale      text not null default 'ar',
  numeral_pref text not null default 'arabic', -- 'arabic' | 'latin'
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ── Programs ────────────────────────────────────────────────────
create table programs (
  id           uuid primary key default gen_random_uuid(),
  name_ar      text not null,
  name_en      text,
  description_ar text,
  description_en text,
  type         program_type not null,
  age_grp      age_group not null,
  gender       gender_t not null default 'both',
  quotient     quotient_t,                  -- the semester's focus
  value_ar     text,                        -- إحسان / انضباط ذاتي ...
  value_en     text,
  start_date   date,
  end_date     date,
  weeks        int not null default 10,
  capacity     int not null default 30,
  price_qar    numeric(10,2) not null default 0,
  status       text not null default 'draft', -- draft|open|closed|archived
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create table program_staff (
  program_id uuid references programs(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  role       app_role not null,
  primary key (program_id, profile_id)
);

-- ── Groups (kid groups inside a program) ────────────────────────
create table groups (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name_ar    text not null,
  name_en    text,
  capacity   int not null default 15,
  created_at timestamptz not null default now()
);

create table group_staff (
  group_id   uuid references groups(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  role       app_role not null, -- group_supervisor | assistant_supervisor
  primary key (group_id, profile_id)
);

-- ── Students & guardians ────────────────────────────────────────
create table students (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references profiles(id) on delete set null, -- student account (optional)
  parent_id     uuid not null references profiles(id) on delete cascade,
  full_name_ar  text not null,
  full_name_en  text,
  dob           date,
  gender        gender_t,
  age_grp       age_group,
  -- PII: encrypted at rest at the DB level; access is audit-logged.
  medical_notes text,
  emergency_contacts jsonb default '[]'::jsonb,
  photo_consent boolean not null default false, -- default = NO consent
  created_at    timestamptz not null default now()
);

create table enrollments (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  program_id uuid not null references programs(id) on delete cascade,
  group_id   uuid references groups(id) on delete set null,
  status     enrollment_status not null default 'pending',
  tier       text default 'full_semester', -- full_semester|per_session|...
  created_at timestamptz not null default now(),
  unique (student_id, program_id)
);

-- ── Sessions & stations (محطات) ─────────────────────────────────
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  group_id   uuid references groups(id) on delete cascade,
  week_no    int,
  date       date not null,
  status     text not null default 'planned', -- planned|open|closed
  created_at timestamptz not null default now()
);

create table stations (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references sessions(id) on delete cascade,
  program_id   uuid references programs(id) on delete cascade, -- for templates
  is_template  boolean not null default false,
  order_index  int not null default 0,
  title_ar     text not null,
  title_en     text,
  duration_min int not null default 30,
  materials_ar text,
  materials_en text,
  quotient     quotient_t,
  skill        skill_t,
  value_ar     text,
  value_en     text,
  book_id      uuid,
  chapter      text,
  created_at   timestamptz not null default now()
);

-- ── Attendance ──────────────────────────────────────────────────
create table attendance (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status     attendance_t not null,
  marked_by  uuid references profiles(id),
  marked_at  timestamptz not null default now(),
  unique (session_id, student_id)
);

-- ── Reports ─────────────────────────────────────────────────────
create table reports (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  group_id     uuid not null references groups(id) on delete cascade,
  author_id    uuid references profiles(id),
  summary_ar   text,
  summary_en   text,
  highlights_ar text,
  highlights_en text,
  highlight_photo text,
  quotient_tags quotient_t[] default '{}',
  skill_tags   skill_t[] default '{}',
  stage        report_stage not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (session_id)
);

create table report_child_notes (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references reports(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  note_ar    text,
  note_en    text,
  unique (report_id, student_id)
);

-- ── Books / curriculum ──────────────────────────────────────────
create table books (
  id           uuid primary key default gen_random_uuid(),
  title_ar     text not null,
  title_en     text,
  year         int,
  type         book_type not null default 'book',
  description_ar text,
  description_en text,
  file_path    text,   -- storage path; served via signed URL
  cover_path   text,
  audio_path   text,
  created_at   timestamptz not null default now()
);

create table book_assignments (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references books(id) on delete cascade,
  group_id   uuid not null references groups(id) on delete cascade,
  chapter    text,
  due_date   date,
  quiz       jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table reading_progress (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  last_page   int not null default 0,
  percent     numeric(5,2) not null default 0,
  bookmarks   jsonb default '[]'::jsonb,
  highlights  jsonb default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (book_id, student_id)
);

-- ── Chat ────────────────────────────────────────────────────────
create table chat_channels (
  id         uuid primary key default gen_random_uuid(),
  type       channel_type not null,
  group_id   uuid references groups(id) on delete cascade,
  title_ar   text,
  title_en   text,
  created_at timestamptz not null default now()
);

create table chat_members (
  channel_id uuid references chat_channels(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  muted      boolean not null default false,
  last_read_at timestamptz,
  primary key (channel_id, profile_id)
);

create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references chat_channels(id) on delete cascade,
  sender_id   uuid references profiles(id),
  body        text,
  media_path  text,
  media_kind  media_type,
  is_announcement boolean not null default false, -- pinned announcement
  moderation  moderation_t not null default 'approved',
  created_at  timestamptz not null default now()
);

create table message_reactions (
  message_id uuid references chat_messages(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  emoji      text not null,
  primary key (message_id, profile_id, emoji)
);

create table message_reads (
  message_id uuid references chat_messages(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  read_at    timestamptz not null default now(),
  primary key (message_id, profile_id)
);

create table pickup_status (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  parent_id  uuid not null references profiles(id) on delete cascade,
  mode       pickup_mode not null,
  person_name text,
  person_phone text,
  note       text,
  created_at timestamptz not null default now()
);

-- ── Gallery ─────────────────────────────────────────────────────
create table gallery_albums (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  title_ar   text not null,
  title_en   text,
  is_highlight boolean not null default false,
  created_at timestamptz not null default now()
);

create table gallery_media (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references gallery_albums(id) on delete cascade,
  group_id    uuid not null references groups(id) on delete cascade,
  session_id  uuid references sessions(id) on delete set null,
  station_id  uuid references stations(id) on delete set null,
  path        text not null,
  kind        media_type not null default 'image',
  caption_ar  text,
  caption_en  text,
  uploaded_by uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ── Payments & consent ──────────────────────────────────────────
create table payments (
  id           uuid primary key default gen_random_uuid(),
  enrollment_id uuid references enrollments(id) on delete set null,
  parent_id    uuid not null references profiles(id) on delete cascade,
  amount       numeric(10,2) not null,
  currency     text not null default 'QAR',
  provider     text not null default 'dibsy',
  provider_ref text,
  status       payment_status not null default 'pending',
  invoice_no   text unique,
  created_at   timestamptz not null default now()
);

create table consents (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  parent_id   uuid not null references profiles(id) on delete cascade,
  photo_consent boolean not null default false,
  medical_form jsonb default '{}'::jsonb,
  signed_at   timestamptz not null default now()
);

-- ── PII access audit log (constraint: log on access) ────────────
create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references profiles(id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  meta       jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────────
create index on program_staff (profile_id);
create index on group_staff (profile_id);
create index on students (parent_id);
create index on enrollments (program_id);
create index on enrollments (group_id);
create index on sessions (group_id, date);
create index on attendance (session_id);
create index on chat_messages (channel_id, created_at);
create index on gallery_media (group_id, session_id);
create index on payments (parent_id);

-- ── Auto-create a profile on signup ─────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name_ar, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name_ar', new.email, 'مستخدم'),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'parent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
