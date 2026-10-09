-- Who compared whom, when, and which way they came in. Read by admins to see what coaches use.
-- Written only by the server (/api/compare); RLS on, no policies.
create table if not exists public.compare_views (
  id uuid primary key default gen_random_uuid(),
  viewer_user_id uuid not null,
  left_athlete_id uuid not null,
  right_athlete_id uuid not null,
  source text,
  created_at timestamptz not null default now()
);
create index if not exists compare_views_viewer_idx on public.compare_views (viewer_user_id, created_at desc);
create index if not exists compare_views_created_idx on public.compare_views (created_at desc);

alter table public.compare_views enable row level security;
revoke all on public.compare_views from anon, authenticated;
