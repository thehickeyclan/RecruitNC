-- Super 32 Command Center (Oct 2026). Applied by hand in the Supabase SQL editor.
-- Service role only: every read and write goes through server routes.

create table if not exists super32_live_uploads (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  kind text not null check (kind in ('flo', 'seeds')),
  file_name text,
  content text not null,
  -- Seeds only: preliminary seeds drive the preview; final seeds tier wins and send alerts.
  seeds_final boolean not null default false,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists super32_live_uploads_event on super32_live_uploads (event_key, kind, created_at desc);

create table if not exists super32_live_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  flo_upload_id uuid references super32_live_uploads (id),
  seeds_upload_id uuid references super32_live_uploads (id),
  data jsonb not null,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists super32_live_snapshots_event on super32_live_snapshots (event_key, created_at desc);

create table if not exists super32_live_alerts (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  -- One alert per bout or milestone, ever, however many times an export is re-uploaded.
  dedupe_key text not null unique,
  kind text not null check (kind in ('huge', 'aa', 'finals', 'champion', 'recap', 'custom', 'test')),
  title text not null,
  body text not null,
  path text not null default '/news/super32-live',
  status text not null default 'pending' check (status in ('pending', 'sent', 'dismissed', 'held')),
  snapshot_id uuid references super32_live_snapshots (id),
  sent_at timestamptz,
  sent_count integer,
  created_at timestamptz not null default now()
);
create index if not exists super32_live_alerts_event on super32_live_alerts (event_key, status, created_at desc);

alter table super32_live_uploads enable row level security;
alter table super32_live_snapshots enable row level security;
alter table super32_live_alerts enable row level security;

-- Who has Super 32 HQ open: one row per browser session, refreshed every 45 seconds.
create table if not exists super32_live_presence (
  session_id text primary key,
  last_seen timestamptz not null default now()
);
create index if not exists super32_live_presence_seen on super32_live_presence (last_seen desc);
alter table super32_live_presence enable row level security;

-- My Wrestlers on Super 32 HQ for signed-in users: their own list, separate from app follows.
create table if not exists super32_live_stars (
  user_id uuid not null,
  star_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, star_key)
);
alter table super32_live_stars enable row level security;
