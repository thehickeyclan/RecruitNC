-- Clean Data Dawg analytics log table (avoids ai_query_logs Prefer/ON CONFLICT 42P10).
-- Run in Supabase SQL Editor, then redeploy app that writes via write_data_dawg_query_log.

create table if not exists public.data_dawg_query_logs (
  id uuid primary key default gen_random_uuid(),
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
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_data_dawg_query_logs_timestamp
  on public.data_dawg_query_logs (timestamp desc);
create index if not exists idx_data_dawg_query_logs_project
  on public.data_dawg_query_logs (project);
create index if not exists idx_data_dawg_query_logs_handler
  on public.data_dawg_query_logs (handler_name);
create index if not exists idx_data_dawg_query_logs_success
  on public.data_dawg_query_logs (success);
create index if not exists idx_data_dawg_query_logs_message_id
  on public.data_dawg_query_logs (message_id);

-- No UNIQUE on message_id — intentional (avoids Prefer: resolution=* 42P10).

alter table public.data_dawg_query_logs enable row level security;

drop policy if exists "data_dawg_query_logs_select_authenticated" on public.data_dawg_query_logs;
create policy "data_dawg_query_logs_select_authenticated"
  on public.data_dawg_query_logs
  for select
  to authenticated
  using (true);

-- Service role bypasses RLS for writes.

create or replace function public.write_data_dawg_query_log(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := coalesce(nullif(payload->>'id', '')::uuid, gen_random_uuid());
  mid text := nullif(btrim(coalesce(payload->>'message_id', '')), '');
begin
  insert into public.data_dawg_query_logs (
    id, query, project, url, response, query_type, response_time_ms,
    feedback, message_id, error_message, handler_name, success, timestamp
  ) values (
    new_id,
    coalesce(payload->>'query', ''),
    coalesce(nullif(payload->>'project', ''), 'recruit-nc'),
    payload->>'url',
    payload->>'response',
    payload->>'query_type',
    nullif(payload->>'response_time_ms', '')::integer,
    payload->>'feedback',
    mid,
    payload->>'error_message',
    payload->>'handler_name',
    case
      when payload ? 'success' and jsonb_typeof(payload->'success') = 'boolean'
        then (payload->>'success')::boolean
      when payload->>'success' in ('true', 'false')
        then (payload->>'success')::boolean
      else true
    end,
    now()
  );
  return new_id;
end;
$$;

grant execute on function public.write_data_dawg_query_log(jsonb)
  to anon, authenticated, service_role;

grant select on public.data_dawg_query_logs to authenticated;
grant all on public.data_dawg_query_logs to service_role;

notify pgrst, 'reload schema';

-- Verify:
select public.write_data_dawg_query_log(
  jsonb_build_object(
    'query', 'setup ping ' || now()::text,
    'project', 'recruit-nc',
    'success', true,
    'handler_name', 'sql_setup_ping'
  )
) as id;
