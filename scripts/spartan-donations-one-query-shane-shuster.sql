-- =============================================================================
-- ONE QUERY — all Spartan checkout rows credited to Shane Shuster (NCU-SHUSTER-27)
-- Paste into Supabase SQL Editor. SQL only. No shell commands.
-- =============================================================================
-- Includes:
--   • rows that already store NCU-SHUSTER-27 on the webhook row
--   • rows tied by spartan_credit_corrections using EITHER checkout id (cs_…) OR payment intent (pi_…)
--
-- OLD payments (before webhook stored stripe_payment_intent_id): run BACKFILL once (below), OR add
-- a second correction row with session_id = the cs_live_… id from spartan_donations.id

-- -----------------------------------------------------------------------------
-- OPTIONAL — run ONCE per old row if pi_ correction exists but row has no PI in JSON yet
-- Replace ids with yours (from spartan_donations).
-- -----------------------------------------------------------------------------
/*
update public.spartan_donations
set raw_metadata = coalesce(raw_metadata, '{}'::jsonb)
  || jsonb_build_object('stripe_payment_intent_id', 'pi_3TMbM3P30On92r5U0IUYgo7S')
where id = 'cs_live_a1PBvqgcuYiaqyMvjsxvRn4sZsE8wRB08JqkUzZa1btrlL5On8qhurOS5w';
*/

-- -----------------------------------------------------------------------------
-- THE ONLY REPORT YOU NEED
-- -----------------------------------------------------------------------------
select
  d.id as checkout_session_id,
  d.created_at,
  d.amount_cents / 100.0 as amount_usd,
  d.donor_email,
  d.athlete_code,
  d.raw_metadata->>'donor_name' as donor_name,
  d.raw_metadata->>'manual_credit_name' as manual_credit_name,
  d.raw_metadata->>'stripe_payment_intent_id' as stripe_payment_intent_id
from public.spartan_donations d
where
  coalesce(d.athlete_code, '') = 'NCU-SHUSTER-27'
  or coalesce(d.raw_metadata->>'athlete_code', '') = 'NCU-SHUSTER-27'
  or coalesce(d.raw_metadata->>'fundraising_code', '') = 'NCU-SHUSTER-27'
  or exists (
    select 1
    from public.spartan_credit_corrections c
    where c.athlete_code = 'NCU-SHUSTER-27'
      and (
        c.session_id = d.id
        or c.session_id = coalesce(d.raw_metadata->>'stripe_payment_intent_id', '')
      )
  )
order by d.created_at desc;
