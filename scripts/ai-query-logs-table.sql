-- Data Dawg query analytics (RecruitNC)
-- Run in Supabase SQL Editor. Safe to re-run.

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

alter table public.ai_query_logs
  add column if not exists handler_name text;

alter table public.ai_query_logs
  add column if not exists success boolean;

create index if not exists idx_ai_query_logs_project on public.ai_query_logs (project);
create index if not exists idx_ai_query_logs_timestamp on public.ai_query_logs (timestamp desc);
create index if not exists idx_ai_query_logs_feedback on public.ai_query_logs (feedback);
create index if not exists idx_ai_query_logs_query_type on public.ai_query_logs (query_type);
create index if not exists idx_ai_query_logs_message_id on public.ai_query_logs (message_id);
create index if not exists idx_ai_query_logs_handler_name on public.ai_query_logs (handler_name);
create index if not exists idx_ai_query_logs_success on public.ai_query_logs (success);

alter table public.ai_query_logs disable row level security;

grant all on public.ai_query_logs to anon;
grant all on public.ai_query_logs to authenticated;
grant all on public.ai_query_logs to service_role;

comment on table public.ai_query_logs is
  'Logs Data Dawg / AI queries for analytics (success, latency, handler, feedback).';

comment on column public.ai_query_logs.handler_name is
  'Handler or agent path that answered (e.g. data_dawg_agent_v2, llm_fallback).';

comment on column public.ai_query_logs.success is
  'true = answer returned without error; false = error or empty answer.';

-- Backfill success for older rows
update public.ai_query_logs
set success = case
  when error_message is not null and error_message <> '' then false
  when response is not null and response <> '' then true
  else false
end
where success is null;
