-- Fix ai_query_logs inserts blocked by PostgREST Prefer: resolution=*
-- against a PARTIAL unique index on message_id.
--
-- Creates insert_ai_query_log (plain INSERT) used by lib/ai-query-log-write.ts.
-- Run in Supabase SQL Editor, then verify with the SELECT at the bottom.

update public.ai_query_logs set message_id = null where message_id = '';

drop index if exists idx_ai_query_logs_message_id_uq;

alter table public.ai_query_logs drop constraint if exists ai_query_logs_message_id_key;
alter table public.ai_query_logs add constraint ai_query_logs_message_id_key unique (message_id);

create or replace function public.insert_ai_query_log(
  p_query text,
  p_project text default 'recruit-nc',
  p_url text default null,
  p_response text default null,
  p_query_type text default null,
  p_response_time_ms integer default null,
  p_feedback text default null,
  p_message_id text default null,
  p_error_message text default null,
  p_handler_name text default null,
  p_success boolean default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  mid text := nullif(trim(coalesce(p_message_id, '')), '');
begin
  insert into public.ai_query_logs (
    id, query, project, url, response, query_type, response_time_ms,
    feedback, message_id, error_message, handler_name, success, timestamp
  ) values (
    new_id,
    p_query,
    coalesce(nullif(p_project, ''), 'recruit-nc'),
    p_url,
    p_response,
    p_query_type,
    p_response_time_ms,
    p_feedback,
    mid,
    p_error_message,
    p_handler_name,
    p_success,
    now()
  );
  return new_id;
end;
$$;

grant execute on function public.insert_ai_query_log(
  text, text, text, text, text, integer, text, text, text, text, boolean
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- Expect a UUID + newest timestamp near now():
-- select public.insert_ai_query_log('sql ping ' || now()::text);
-- select max(timestamp) as newest from public.ai_query_logs;
