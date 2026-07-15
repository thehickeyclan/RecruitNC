-- ============================================================================ ai_query_logs 42P10 (ON CONFLICT) for Data Dawg analytics writes.
-- Root causes we have seen:
--   1) Stale insert_ai_query_log() overload that still uses ON CONFLICT
--   2) Prefer: resolution=* + PARTIAL unique index on message_id (no matching target)
--
-- Run ALL of this in Supabase SQL Editor.

-- 0) Inspect (optional — paste results if still failing)
-- select pg_get_functiondef(p.oid)
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname in ('insert_ai_query_log','write_ai_query_log');
-- select indexname, indexdef from pg_indexes
-- where schemaname='public' and tablename='ai_query_logs' and indexdef ilike '%message_id%';

-- 1) Normalize empty message_ids; collapse duplicate non-null message_ids (keep newest)
update public.ai_query_logs set message_id = null where message_id is not null and trim(message_id) = '';

with dups as (
  select id,
         row_number() over (partition by message_id order by timestamp desc nulls last, id desc) as rn
  from public.ai_query_logs
  where message_id is not null
)
update public.ai_query_logs a
set message_id = null
from dups d
where a.id = d.id and d.rn > 1;

-- 2) Drop EVERY unique index/constraint on message_id (partial or full)
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'ai_query_logs'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%message_id%'
  loop
    execute format('alter table public.ai_query_logs drop constraint if exists %I', r.conname);
  end loop;

  for r in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'ai_query_logs'
      and indexdef ilike '%unique%'
      and indexdef ilike '%message_id%'
  loop
    execute format('drop index if exists public.%I', r.indexname);
  end loop;
end $$;

drop index if exists idx_ai_query_logs_message_id_uq;

-- 3) Full UNIQUE so Prefer: resolution=* (if injected by gateway) has a target
alter table public.ai_query_logs
  add constraint ai_query_logs_message_id_key unique (message_id);

-- 4) Drop ALL overloads of the old RPC name (may still contain ON CONFLICT)
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'insert_ai_query_log'
  loop
    execute format('drop function if exists %s', r.sig);
  end loop;
end $$;

-- 5) New single-arg RPC used by lib/ai-query-log-write.ts (plain INSERT only)
create or replace function public.write_ai_query_log(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  mid text := nullif(trim(coalesce(payload->>'message_id', '')), '');
begin
  insert into public.ai_query_logs (
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
      when payload ? 'success' and payload->>'success' is not null
        then (payload->>'success')::boolean
      else null
    end,
    now()
  );
  return new_id;
end;
$$;

grant execute on function public.write_ai_query_log(jsonb) to anon, authenticated, service_role;

-- Keep a simple plain-INSERT alias for manual SQL pings
create or replace function public.insert_ai_query_log(p_query text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.write_ai_query_log(jsonb_build_object('query', p_query, 'project', 'recruit-nc', 'success', true));
$$;

grant execute on function public.insert_ai_query_log(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- Verify (must return a UUID):
-- select public.write_ai_query_log('{"query":"sql write_ai_query_log ping","project":"recruit-nc","success":true}'::jsonb);
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.ai_query_logs'::regclass and contype = 'u';
