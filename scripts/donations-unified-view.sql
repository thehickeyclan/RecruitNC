-- donations_unified: read-only view over paid Spartan checkouts (hub may still use spartan_donations in TS).

create or replace view public.donations_unified as
select
  id,
  created_at,
  amount_cents,
  athlete_code,
  donor_email,
  donor_name,
  athlete_display_name,
  spartan_campaign as campaign_slug,
  (coalesce(fundraising_type, '') = 'race_donation') as is_race_checkout,
  (status = 'paid') as is_paid
from public.spartan_donations
where status = 'paid';

comment on view public.donations_unified is
  'Paid gifts for reporting; add UNION ALL when more campaign tables exist.';
