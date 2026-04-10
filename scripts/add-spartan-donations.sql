-- Run in Supabase SQL Editor (safe to re-run)
create table if not exists public.spartan_donations (
  id                   text primary key, -- Stripe charge id (Checkout session id in webhook)
  created_at           timestamptz not null,
  amount_cents         integer not null,
  currency             text not null default 'usd',
  status               text not null,
  athlete_code         text,
  athlete_display_name text,
  fundraising_type     text,
  spartan_campaign     text,
  donor_email          text,
  donor_name           text,
  stripe_charge_id     text not null,
  raw_metadata         jsonb
);

create index if not exists idx_spartan_donations_created_at
  on public.spartan_donations (created_at);

create index if not exists idx_spartan_donations_athlete_code
  on public.spartan_donations (athlete_code);

create index if not exists idx_spartan_donations_campaign
  on public.spartan_donations (spartan_campaign);

comment on table public.spartan_donations is
  'Spartan fundraiser donations synced from Stripe via webhook. One row per charge.';
