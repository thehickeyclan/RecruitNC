-- Optional overrides when Stripe Checkout metadata is wrong after payment.
-- Run in Supabase SQL Editor. Service role / app uses this table; no public anon policy needed.

create table if not exists public.spartan_credit_corrections (
  session_id text primary key,
  athlete_code text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_spartan_credit_corrections_athlete_code
  on public.spartan_credit_corrections (athlete_code);

comment on table public.spartan_credit_corrections is
  'Manual fundraising credit fixes keyed by Stripe Checkout Session id (cs_...). Merged in /api/spartan/supporters and admin spartan-donations.';

-- Example (replace session_id with real cs_... from Stripe → Payment → Checkout Session):
-- insert into public.spartan_credit_corrections (session_id, athlete_code, note)
-- values (
--   'cs_REPLACE_ME',
--   'NCU-SHUSTER-27',
--   'Lisa Koh $155 — credit to Shane Shuster; manual name had Roland Owen'
-- )
-- on conflict (session_id) do update set
--   athlete_code = excluded.athlete_code,
--   note = excluded.note;

-- App uses service role only; no policies for anon/authenticated.
alter table public.spartan_credit_corrections enable row level security;
