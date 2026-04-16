-- Spartan Fayetteville gifts tied to Shane Shuster (fundraising code NCU-SHUSTER-27).
-- Run in Supabase SQL Editor.
--
-- What you'll see:
-- • Rows with athlete_code = NCU-SHUSTER-27 = Stripe checkout metadata credited to Shane at webhook time.
-- • Parent (payer): donor_email and raw_metadata->>'donor_name' (who completed checkout).
-- • Roland may appear only in raw_metadata->>'manual_credit_name' if that was typed at checkout;
--   fundraising credit in the app is driven by athlete_code + spartan_credit_corrections.
-- • spartan_credit_corrections lists manual fixes (session_id may be cs_… or pi_…).

-- ---------------------------------------------------------------------------
-- 1) Donations stored with Shane's code (webhook snapshot)
-- ---------------------------------------------------------------------------
select
  id as checkout_session_id,
  created_at,
  amount_cents / 100.0 as amount_usd,
  donor_email,
  athlete_code,
  athlete_display_name,
  fundraising_type,
  spartan_campaign,
  raw_metadata->>'donor_name' as donor_name_from_metadata,
  raw_metadata->>'manual_credit_name' as manual_credit_name,
  raw_metadata->>'race_entry_requested' as race_entry_requested,
  raw_metadata->>'tier_preference' as tier_preference
from public.spartan_donations
where coalesce(athlete_code, '') = 'NCU-SHUSTER-27'
   or coalesce(raw_metadata->>'athlete_code', '') = 'NCU-SHUSTER-27'
   or coalesce(raw_metadata->>'fundraising_code', '') = 'NCU-SHUSTER-27'
order by created_at desc;

-- ---------------------------------------------------------------------------
-- 2) Manual credit overrides for Shane (Lisa/Roland fix lives here if you used pi_ or cs_)
-- ---------------------------------------------------------------------------
select session_id, athlete_code, note, created_at
from public.spartan_credit_corrections
where athlete_code = 'NCU-SHUSTER-27'
order by created_at desc;

-- ---------------------------------------------------------------------------
-- 3) Optional: locate one payment by parent email or manual name (uncomment)
-- ---------------------------------------------------------------------------
/*
select
  id,
  created_at,
  amount_cents / 100.0 as amount_usd,
  donor_email,
  athlete_code,
  raw_metadata->>'donor_name' as donor_name,
  raw_metadata->>'manual_credit_name' as manual_credit_name
from public.spartan_donations
where donor_email ilike '%lisakoh%'
   or raw_metadata->>'manual_credit_name' ilike '%roland%owen%'
order by created_at desc;
*/
