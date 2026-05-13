-- Athlete gift pages: Stripe embed only when checkout_live is true (after NC United approves activation).
-- Run in Supabase SQL Editor.

alter table public.athlete_fundraising_profiles
  add column if not exists checkout_live boolean not null default false;

comment on column public.athlete_fundraising_profiles.checkout_live is
  'When true, /fundraising/athletes/{slug} may embed Stripe checkout. Set by staff after activation approval; default false for new rows.';

-- ---------------------------------------------------------------------------
-- Backfill (URGENT after deploy): profiles that were already live need checkout_live = true
-- or their public page hides checkout. Do NOT blanket-update every active row without review.
-- ---------------------------------------------------------------------------

-- Step 1 — see who would be affected (active profiles, checkout still off):
-- select id, athlete_id, slug, is_active, checkout_live, primary_fundraising_code, updated_at
-- from public.athlete_fundraising_profiles
-- where is_active = true and checkout_live = false
-- order by slug;

-- Step 2 — turn on only athletes you know were already taking public gifts (example: filter by NCU):
-- update public.athlete_fundraising_profiles
-- set checkout_live = true,
--     updated_at = now()
-- where is_active = true
--   and primary_fundraising_code in ('NCU-SHUSTER-28', 'NCU-ELLISON-28');
--   -- add more codes, or use slug in ('ncu-ellison-28', ...) instead

-- Step 3 — only if you have reviewed the list and accept turning on every active profile:
-- update public.athlete_fundraising_profiles
-- set checkout_live = true,
--     updated_at = now()
-- where is_active = true;
