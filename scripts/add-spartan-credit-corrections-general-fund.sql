-- Run once in Supabase → SQL Editor (after add-spartan-credit-corrections.sql exists).
-- Allows re-assigning a paid session from an individual NCU credit to the NC United community fund.

alter table public.spartan_credit_corrections
  add column if not exists general_fund boolean not null default false;

alter table public.spartan_credit_corrections
  alter column athlete_code drop not null;

comment on column public.spartan_credit_corrections.general_fund is
  'When true, this Stripe session (cs_… or pi_…) is credited to NC United community fund in-app (not an individual wrestler).';
