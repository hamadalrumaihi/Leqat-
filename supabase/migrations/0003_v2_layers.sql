-- ════════════════════════════════════════════════════════════════
--  0003_v2_layers.sql — Qatar/Gulf, pedagogical, parent, ops,
--  community, trust & safety layers (additive to 0001).
-- ════════════════════════════════════════════════════════════════

-- ── Profile additions: QID, safeguarding, notify prefs ──────────
alter table profiles add column if not exists qid text
  check (qid is null or qid ~ '^[0-9]{11}$');           -- Qatar ID format
alter table profiles add column if not exists qid_verified boolean not null default false;
alter table profiles add column if not exists background_check_status text
  not null default 'not_required';                       -- internal-only
alter table profiles add column if not exists notify_prefs jsonb
  not null default '{"posts":true,"dms":true,"prayer_aware":true}'::jsonb;

-- ── Program additions: prayer-aware + Ramadan mode ──────────────
alter table programs add column if not exists prayer_aware boolean not null default true;
alter table programs add column if not exists ramadan_mode boolean not null default false;

-- ── Story library (قصص تربوية) ─────────────────────────────────
create table if not exists stories (
  id          uuid primary key default gen_random_uuid(),
  title_ar    text not null,
  title_en    text,
  body_ar     text,
  body_en     text,
  value_ar    text,
  age_grp     age_group,
  quotient    quotient_t,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ── Station additions: REPEAT tag + linked story ────────────────
alter table stations add column if not exists repeat_tag text;  -- R/E/P/E/A/T
alter table stations add column if not exists story_id uuid references stories(id);

-- ── Report addition: REPEAT coverage tags ───────────────────────
alter table reports add column if not exists repeat_tags text[] default '{}';
alter table reports add column if not exists ai_assisted boolean not null default false;

-- ── Behaviour recognition (digital حوافز معنوية) ───────────────
create table if not exists recognition_tokens (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  awarded_by  uuid references profiles(id),
  session_id  uuid references sessions(id) on delete set null,
  value_ar    text not null,           -- e.g. "إحسان", "تعاون"
  note_ar     text,
  created_at  timestamptz not null default now()
);

-- ── Consent withdrawal + retroactive blur ───────────────────────
alter table consents add column if not exists withdrawn_at timestamptz;
alter table gallery_media add column if not exists blurred boolean not null default false;

-- ── Two-adult rule on staff↔student DMs ─────────────────────────
alter table chat_channels add column if not exists cc_profile_id uuid references profiles(id);
alter table chat_channels add column if not exists is_staff_student boolean not null default false;

-- ── Pickup release log (released to named person + time) ────────
alter table pickup_status add column if not exists released_at timestamptz;
alter table pickup_status add column if not exists released_by uuid references profiles(id);

-- ── Permission slips (digital, e-signed) for trips ──────────────
create table if not exists permission_slips (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references programs(id) on delete cascade,
  title_ar    text not null,
  title_en    text,
  body_ar     text not null,
  due_date    date,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

create table if not exists permission_slip_signatures (
  id          uuid primary key default gen_random_uuid(),
  slip_id     uuid not null references permission_slips(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  parent_id   uuid not null references profiles(id) on delete cascade,
  signed_name text not null,
  signed_at   timestamptz not null default now(),
  unique (slip_id, student_id)
);

-- ── Parent satisfaction pulse (after each session) ──────────────
create table if not exists session_feedback (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  parent_id   uuid not null references profiles(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (session_id, parent_id)
);

-- ── Inventory tracking ──────────────────────────────────────────
create table if not exists inventory_items (
  id          uuid primary key default gen_random_uuid(),
  name_ar     text not null,
  name_en     text,
  total_qty   int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists inventory_checkouts (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references inventory_items(id) on delete cascade,
  qty         int not null default 1,
  taken_by    uuid references profiles(id),
  session_id  uuid references sessions(id) on delete set null,
  taken_at    timestamptz not null default now(),
  returned_at timestamptz
);

create index if not exists recognition_student_idx on recognition_tokens (student_id);
create index if not exists slip_sig_student_idx on permission_slip_signatures (student_id);
create index if not exists feedback_session_idx on session_feedback (session_id);
