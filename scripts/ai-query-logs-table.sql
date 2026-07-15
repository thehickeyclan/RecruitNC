-- Data Dawg query analytics (RecruitNC)
-- Run in Supabase SQL Editor. Safe to re-run.
-- Fixes empty analytics when insert fails with:
--   "no unique or exclusion constraint matching the ON CONFLICT specification"

create table if not exists public.ai_query_logs (
  id uuid default gen_random_uuid() primary key,
  query text not null,
  project text default 'recruit-nc',
  url text,
  response text,
  query_type text,
  response_time_ms integer,
  feedback text,
  message_id text,
  error_message text,
  handler_name text,
  success boolean,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- Ensure PRIMARY KEY on id (required for Prefer: ignore-duplicates / upsert on id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_query_logs'::regclass
      and contype = 'p'
  ) then
    alter table public.ai_query_logs
      add constraint ai_query_logs_pkey primary key (id);
  end if;
exception
  when others then
    raise notice 'Could not add primary key on ai_query_logs.id: %', SQLERRM;
end $$;

alter table public.ai_query_logs add column if not exists handler_name text;
alter table public.ai_query_logs add column if not exists success boolean;
alter table public.ai_query_logs add column if not exists message_id text;
alter table public.ai_query_logs add column if not exists timestamp timestamptz default now();

-- Unique message_id when present (supports upserts / Prefer conflicts)
create unique index if not exists idx_ai_query_logs_message_id_uq
  on public.ai_query_logs (message_id)
  where message_id is not null and message_id <> '';

create index if not exists idx_ai_query_logs_project on public.ai_query_logs (project);
create index if not exists idx_ai_query_logs_timestamp on public.ai_query_logs (timestamp desc);
create index if not exists idx_ai_query_logs_feedback on public.ai_query_logs (feedback);
create index if not exists idx_ai_query_logs_query_type on public.ai_query_logs (query_type);
create index if not exists idx_ai_query_logs_handler_name on public.ai_query_logs (handler_name);
create index if not exists idx_ai_query_logs_success on public.ai_query_logs (success);

alter table public.ai_query_logs disable row level security;

grant all on public.ai_query_logs to anon;
grant all on public.ai_query_logs to authenticated;
grant all on public.ai_query_logs to service_role;

update public.ai_query_logs
set success = case
  when error_message is not null and error_message <> '' then false
  when response is not null and response <> '' then true
  else false
end
where success is null;

-- Sanity: list constraints
select conname, contype
from pg_constraint
where conrelid = 'public.ai_query_logs'::regclass
order by contype, conname;
