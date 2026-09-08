create table if not exists public.push_install_events (
  id uuid primary key default gen_random_uuid(),
  installation_id text not null,
  event_type text not null,
  platform text,
  permission_status text,
  alerts_enabled boolean,
  app_version text,
  build_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists push_install_events_installation_created_idx
  on public.push_install_events (installation_id, created_at desc);
create index if not exists push_install_events_type_created_idx
  on public.push_install_events (event_type, created_at desc);
alter table public.push_install_events enable row level security;

create table if not exists public.push_notification_sends (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  targeted integer not null default 0,
  accepted integer not null default 0,
  failed integer not null default 0,
  delivered integer not null default 0,
  undelivered integer not null default 0,
  pending integer not null default 0,
  pruned integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null references public.push_notification_sends(id) on delete cascade,
  expo_ticket_id text,
  token_hash text not null,
  status text not null,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_notification_deliveries_send_idx
  on public.push_notification_deliveries (send_id, status);
create unique index if not exists push_notification_deliveries_ticket_idx
  on public.push_notification_deliveries (expo_ticket_id) where expo_ticket_id is not null;
alter table public.push_notification_sends enable row level security;
alter table public.push_notification_deliveries enable row level security;

