# Blue Express Interest form – database table

The Blue page "State Qualifier Interest" form submits to `POST /api/blue/express-interest`, which writes to Supabase.

## Table: `blue_express_interest`

Create this table in the Supabase SQL editor if it does not exist:

```sql
create table if not exists public.blue_express_interest (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  cell_phone text not null,
  graduation_year text not null,
  highest_achievement text not null check (highest_achievement in (
    'all_american', 'state_champion', 'state_placer', 'state_qualifier', 'na'
  )),
  created_at timestamptz not null default now()
);

alter table public.blue_express_interest enable row level security;

create policy "Allow anonymous insert for express interest form"
  on public.blue_express_interest for insert to anon with check (true);

create policy "Service role can read all"
  on public.blue_express_interest for select to service_role using (true);
```

Form fields: first name, last name, cell, graduation year, highest level achievement (All American, State Champion, State Placer, State Qualifier, N/A).
