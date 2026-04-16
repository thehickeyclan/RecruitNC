-- RUN THIS ONCE in Supabase → SQL Editor (any environment where /spartan corrections are used).
-- Creates public.spartan_credit_corrections. App merges these with Stripe lists for fundraising credit fixes.

create table if not exists public.spartan_credit_corrections (
  session_id text primary key,
  athlete_code text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_spartan_credit_corrections_athlete_code
  on public.spartan_credit_corrections (athlete_code);

comment on table public.spartan_credit_corrections is
  'Manual fundraising credit fixes. session_id = Stripe Checkout Session (cs_…) or Payment Intent (pi_…). Merged in API.';

-- Only service_role (server) needs access; block accidental anon API use.
alter table public.spartan_credit_corrections enable row level security;
