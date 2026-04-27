-- Run in Supabase SQL Editor (corrections only; replace code if needed)
select session_id, athlete_code, note, created_at
from public.spartan_credit_corrections
where upper(trim(athlete_code)) = 'NCU-PALMER-29'
order by created_at desc;

-- Full list = Stripe + corrections: npx tsx scripts/list-spartan-payments-for-ncu-code.ts NCU-PALMER-29 120
