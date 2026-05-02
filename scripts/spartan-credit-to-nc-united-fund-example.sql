-- Example: move one paid checkout from individual credit → NC United fund (in-app totals / /spartan).
-- 1) Run add-spartan-credit-corrections-general-fund.sql first if you have not.
-- 2) In Stripe Dashboard → Payment → copy cs_… or pi_… for the Eric Amstutz $500 payment.
-- 3) Replace the placeholder and run.

insert into public.spartan_credit_corrections (session_id, athlete_code, general_fund)
values ('cs_REPLACE_WITH_STRIPE_CHECKOUT_SESSION_ID', null, true)
on conflict (session_id) do update set
  athlete_code = excluded.athlete_code,
  general_fund = excluded.general_fund;
