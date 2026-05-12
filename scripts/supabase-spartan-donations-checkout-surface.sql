-- Run once in Supabase SQL Editor (safe to re-run).
-- First-class checkout source for reporting — no Stripe UI required.

alter table public.spartan_donations
  add column if not exists fundraising_checkout_surface text,
  add column if not exists fundraising_athlete_slug text;

create index if not exists idx_spartan_donations_checkout_surface
  on public.spartan_donations (fundraising_checkout_surface);

comment on column public.spartan_donations.fundraising_checkout_surface is
  'Webhook: athlete_page | training_fund | scholarship_fund | spartan_team_page | hub_give | … (from metadata or success_url).';
comment on column public.spartan_donations.fundraising_athlete_slug is
  'When athlete_page: slug from metadata or /fundraising/athletes/{slug}/ in success_url.';

-- Backfill from existing raw_metadata (Stripe session metadata snapshot).
update public.spartan_donations d
set
  fundraising_checkout_surface = coalesce(
    nullif(trim(d.fundraising_checkout_surface), ''),
    nullif(trim(d.raw_metadata->>'fundraising_checkout_surface'), '')
  ),
  fundraising_athlete_slug = coalesce(
    nullif(trim(d.fundraising_athlete_slug), ''),
    nullif(lower(trim(d.raw_metadata->>'fundraising_athlete_slug')), '')
  )
where d.raw_metadata is not null
  and (
    nullif(trim(d.fundraising_checkout_surface), '') is null
    or nullif(trim(d.fundraising_athlete_slug), '') is null
  );
