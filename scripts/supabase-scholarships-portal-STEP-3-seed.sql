-- STEP 3 OF 3 — Seed Caden Perry row (run after STEP 1 + STEP 2).

INSERT INTO public.scholarships (
  slug, name, tagline, description, criteria, established_year, status, award_amount_cents,
  applications_open_date, applications_close_date, award_announcement_date, family_name
)
VALUES (
  'caden-perry',
  'The Caden Perry Scholarship',
  'The future is bright for those who refuse to quit.',
  'This scholarship was established in memory of Caden Perry — a North Carolina wrestler who began competing at age six, faced a terminal diagnosis at thirteen, and spent three more years proving that the mat builds something medicine cannot measure. Full memorial narrative pending approval from the Perry family.',
  'Selection emphasizes resilience in the face of adversity — on or off the mat; character that reflects what wrestling builds; perseverance through hardship, setbacks, and challenging circumstances; and a mindset that carries beyond the sport. Academic record and win-loss record are not selection criteria.',
  2026,
  'applications_closed',
  NULL, NULL, NULL, NULL,
  'Perry family'
)
ON CONFLICT (slug) DO NOTHING;
