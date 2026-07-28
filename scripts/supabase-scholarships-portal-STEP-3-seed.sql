-- STEP 3 OF 3 — Seed Caden Perry row (run after STEP 1 + STEP 2).

INSERT INTO public.scholarships (
  slug, name, tagline, description, criteria, established_year, status, award_amount_cents,
  applications_open_date, applications_close_date, award_announcement_date, family_name
)
VALUES (
  'caden-perry',
  'The Caden Perry Warrior Scholarship',
  'The future is bright for those who refuse to quit.',
  'This wrestling-support award was established in memory of Caden Perry and is presented annually at the NC United Tournament of Champions. It recognizes a North Carolina wrestler whose response to genuine adversity reflects courage, resilience, character, and the refusal to quit. The recipient does not have to compete in the Tournament of Champions.',
  'Selection emphasizes documented response to adversity, character and integrity, impact on others, and a wrestling-forged mindset. Rankings, records, championships, recruiting status, academic record, and school or club affiliation are not selection criteria.',
  2026,
  'applications_open',
  100000, '2026-08-01', '2026-08-30', '2026-09-19',
  'Perry family'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  award_amount_cents = EXCLUDED.award_amount_cents,
  applications_open_date = EXCLUDED.applications_open_date,
  applications_close_date = EXCLUDED.applications_close_date,
  award_announcement_date = EXCLUDED.award_announcement_date,
  family_name = EXCLUDED.family_name;
