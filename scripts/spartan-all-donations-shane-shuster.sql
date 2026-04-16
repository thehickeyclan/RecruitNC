-- Supabase SQL Editor ONLY — do not paste terminal/cat commands into Supabase.
-- Run each block below one at a time, or all three (Supabase runs multiple statements).

-- ========== 1) Donations that already stored Shane code at webhook ==========
select
  id as checkout_session_id,
  created_at,
  amount_cents / 100.0 as amount_usd,
  donor_email,
  athlete_code,
  raw_metadata->>'donor_name' as donor_name,
  raw_metadata->>'manual_credit_name' as manual_credit_name
from public.spartan_donations
where coalesce(athlete_code, '') = 'NCU-SHUSTER-27'
   or coalesce(raw_metadata->>'athlete_code', '') = 'NCU-SHUSTER-27'
   or coalesce(raw_metadata->>'fundraising_code', '') = 'NCU-SHUSTER-27'
order by created_at desc;

-- ========== 2) Manual corrections pointing credit to Shane (your pi_ row) ==========
select session_id, athlete_code, note, created_at
from public.spartan_credit_corrections
where athlete_code = 'NCU-SHUSTER-27'
order by created_at desc;

-- ========== 3) Optional: parent email lookup — amount is on cs_ row ==========
select
  id as checkout_session_id,
  created_at,
  amount_cents / 100.0 as amount_usd,
  donor_email,
  raw_metadata->>'manual_credit_name' as manual_credit_name
from public.spartan_donations
where donor_email ilike '%lisakoh%'
order by created_at desc;
