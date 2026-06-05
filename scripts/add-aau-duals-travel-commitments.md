# AAU Duals roster — verbal travel commitments (admin)

Run in **Supabase SQL Editor** once. Stores what each family verbally committed to (flight, hotel, or both) per roster weight slot.

```sql
create table if not exists public.aau_duals_roster_travel_commitments (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  weight_label text not null,
  travel_need text not null default 'none'
    check (travel_need in ('none', 'flight', 'hotel', 'flight_hotel')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  unique (event_slug, weight_label)
);

create index if not exists idx_aau_duals_travel_commitments_event
  on public.aau_duals_roster_travel_commitments (event_slug);

alter table public.aau_duals_roster_travel_commitments enable row level security;

-- Service role / admin API only (no public access)
create policy "Service role full access aau travel commitments"
  on public.aau_duals_roster_travel_commitments
  for all
  to service_role
  using (true)
  with check (true);
```
