-- NHSCA Duals results — RLS (writes via Next.js service role API)

alter table public.nhsca_duals_teams enable row level security;
alter table public.nhsca_duals_wrestlers enable row level security;
alter table public.nhsca_duals_event_days enable row level security;
alter table public.nhsca_duals_pools enable row level security;
alter table public.nhsca_duals_duals enable row level security;
alter table public.nhsca_duals_matches enable row level security;

create policy "nhsca_duals_teams_select" on public.nhsca_duals_teams
  for select to authenticated using (true);

create policy "nhsca_duals_wrestlers_select" on public.nhsca_duals_wrestlers
  for select to authenticated using (true);

create policy "nhsca_duals_event_days_select" on public.nhsca_duals_event_days
  for select to authenticated using (true);

create policy "nhsca_duals_pools_select" on public.nhsca_duals_pools
  for select to authenticated using (true);

create policy "nhsca_duals_duals_select" on public.nhsca_duals_duals
  for select to authenticated using (published = true);

create policy "nhsca_duals_matches_select" on public.nhsca_duals_matches
  for select to authenticated
  using (
    exists (
      select 1 from public.nhsca_duals_duals d
      where d.id = dual_id and d.published = true
    )
  );
