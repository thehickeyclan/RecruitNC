-- FIX 42P10 on ai_query_logs (Data Dawg analytics Test write)
--
-- Prefer: resolution=* (often injected by PostgREST/Supabase) generates
--   INSERT ... ON CONFLICT ...
-- That fails with 42P10 when:
--   • there is NO primary key on id, and/or
--   • the only unique on message_id is PARTIAL (WHERE message_id IS NOT NULL)
--
-- Run this entire script in Supabase SQL Editor, then Test write again.
-- Works even before the next Vercel deploy (REST path needs the constraints).

-- ---------------------------------------------------------------------------
-- A) Diagnostics (optional — copy results if still broken)
-- ---------------------------------------------------------------------------
-- select conname, contype, pg_get_constraintdef(oid)
-- from pg_constraint where conrelid = 'public.ai_query_logs'::regclass order by 1;
-- select indexname, indexdef from pg_indexes
-- where schemaname='public' and tablename='ai_query_logs';
-- select tgname, pg_get_triggerdef(oid) from pg_trigger
-- where tgrelid = 'public.ai_query_logs'::regclass and not tgisinternal;

-- ---------------------------------------------------------------------------
-- B) Clean message_id so a FULL unique is possible
-- ---------------------------------------------------------------------------
update public.ai_query_logs
set message_id = null
where message_id is not null and btrim(message_id) = '';

with dups as (
  select id,
         row_number() over (
           partition by message_id
           order by coalesce(timestamp, created_at) desc nulls last, id desc
         ) as rn
  from public.ai_query_logs
  where message_id is not null
)
update public.ai_query_logs a
set message_id = null
from dups d
where a.id = d.id and d.rn > 1;

-- ---------------------------------------------------------------------------
-- C) Ensure PRIMARY KEY on id (Prefer resolution often upserts on PK)
-- ---------------------------------------------------------------------------
-- Deduplicate id if needed (should be rare)
with id_dups as (
  select id, row_number() over (partition by id order by coalesce(timestamp, created_at) desc) as rn
  from public.ai_query_logs
)
delete from public.ai_query_logs a
using id_dups d
where a.id = d.id and d.rn > 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_query_logs'::regclass and contype = 'p'
  ) then
    alter table public.ai_query_logs
      add constraint ai_query_logs_pkey primary key (id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- D) Drop EVERY unique/index on message_id (partial AND full), then full UNIQUE
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'ai_query_logs'
      and c.contype in ('u','x')
      and pg_get_constraintdef(c.oid) ilike '%message_id%'
  loop
    execute format('alter table public.ai_query_logs drop constraint %I', r.conname);
  end loop;

  for r in
    select i.indexname
    from pg_indexes i
    where i.schemaname = 'public' and i.tablename = 'ai_query_logs'
      and i.indexdef ilike '%message_id%'
      and i.indexdef ilike '%unique%'
  loop
    execute format('drop index if exists public.%I', r.indexname);
  end loop;
end $$;

drop index if exists public.idx_ai_query_logs_message_id_uq;

alter table public.ai_query_logs
  drop constraint if exists ai_query_logs_message_id_key;

alter table public.ai_query_logs
  add constraint ai_query_logs_message_id_key unique (message_id);

-- ---------------------------------------------------------------------------
-- E) Recreate plain-INSERT RPCs (no ON CONFLICT in function body)
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('insert_ai_query_log', 'write_ai_query_log')
  loop
    execute format('drop function if exists %s', r.sig);
  end loop;
end $$;

create or replace function public.write_ai_query_log(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := coalesce(
    nullif(payload->>'id', '')::uuid,
    gen_random_uuid()
  );
  mid text := nullif(btrim(coalesce(payload->>'message_id', '')), '');
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
      when payload ? 'success' and jsonb_typeof(payload->'success') = 'boolean'
        then (payload->>'success')::boolean
      when payload->>'success' in ('true','false')
        then (payload->>'success')::boolean
      else true
    end,
    now()
  );
  return new_id;
end;
$$;

grant execute on function public.write_ai_query_log(jsonb)
  to anon, authenticated, service_role;

create or replace function public.insert_ai_query_log(p_query text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.write_ai_query_log(
    jsonb_build_object('query', p_query, 'project', 'recruit-nc', 'success', true)
  );
$$;

grant execute on function public.insert_ai_query_log(text)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- F) Must return UUID + show constraints
-- ---------------------------------------------------------------------------
select public.write_ai_query_log(
  jsonb_build_object(
    'query', 'constraint-fix ping ' || now()::text,
    'project', 'recruit-nc',
    'success', true,
    'handler_name', 'sql_constraint_fix'
  )
) as write_id;

select conname, contype, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.ai_query_logs'::regclass
order by contype, conname;
