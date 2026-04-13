-- Run in Supabase SQL Editor: link drop-in requests to parent auth user and athlete profile.
-- Safe to run once; uses IF NOT EXISTS patterns where applicable.

alter table public.drop_in_requests
  add column if not exists parent_user_id uuid references auth.users (id) on delete set null;

alter table public.drop_in_requests
  add column if not exists athlete_id uuid references public.athletes (id) on delete set null;

create index if not exists idx_drop_in_requests_parent_user_id on public.drop_in_requests (parent_user_id);
create index if not exists idx_drop_in_requests_athlete_id on public.drop_in_requests (athlete_id);

comment on column public.drop_in_requests.parent_user_id is 'RecruitNC auth user (parent) who submitted checkout when session was present.';
comment on column public.drop_in_requests.athlete_id is 'Linked athlete when parent selected a wrestler from parent_athlete_links; null for manual-only entry.';
