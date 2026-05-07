-- NC United Scholarship Portal — full migration (tables + RLS + seed).
--
-- Easiest: run STEP files in order:
--   1) supabase-scholarships-portal-STEP-1-tables-only.sql  ← creates tables
--   2) supabase-scholarships-portal-STEP-2-rls.sql
--   3) supabase-scholarships-portal-STEP-3-seed.sql
--
-- Or run THIS WHOLE FILE at once (select-all — no partial). Uses schema `public`.

CREATE TABLE IF NOT EXISTS public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  description text,
  criteria text,
  established_year integer,
  status text DEFAULT 'active' NOT NULL,
  award_amount_cents integer,
  hero_image_url text,
  family_name text,
  family_contact_email text,
  total_donated_cents integer DEFAULT 0 NOT NULL,
  total_awarded_cents integer DEFAULT 0 NOT NULL,
  applications_open_date date,
  applications_close_date date,
  award_announcement_date date,
  CONSTRAINT scholarships_status_chk CHECK (
    status IN ('active', 'applications_open', 'applications_closed', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS idx_scholarships_slug ON public.scholarships (slug);

CREATE TABLE IF NOT EXISTS public.scholarship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships (id) ON DELETE CASCADE,
  athlete_name text NOT NULL,
  athlete_school text NOT NULL,
  athlete_grad_year integer,
  athlete_weight_class text,
  athlete_email text,
  athlete_phone text,
  nominator_name text NOT NULL,
  nominator_relationship text NOT NULL,
  nominator_email text NOT NULL,
  nominator_phone text,
  written_statement text NOT NULL,
  wrestling_moment text,
  reference_name text,
  reference_relationship text,
  reference_email text,
  reference_phone text,
  status text DEFAULT 'submitted' NOT NULL,
  admin_notes text,
  notified_at timestamptz,
  CONSTRAINT scholarship_applications_status_chk CHECK (
    status IN ('submitted', 'under_review', 'finalist', 'awarded', 'not_selected')
  )
);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_scholarship ON public.scholarship_applications (scholarship_id);

CREATE TABLE IF NOT EXISTS public.scholarship_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  application_id uuid NOT NULL REFERENCES public.scholarship_applications (id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewer_name text,
  reviewer_role text,
  score integer CHECK (score IS NULL OR (score >= 1 AND score <= 5)),
  comment text,
  is_finalist_vote boolean DEFAULT false NOT NULL,
  CONSTRAINT scholarship_reviews_role_chk CHECK (
    reviewer_role IS NULL OR reviewer_role IN ('family', 'committee', 'admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_scholarship_reviews_application ON public.scholarship_reviews (application_id);

CREATE TABLE IF NOT EXISTS public.scholarship_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  awarded_at timestamptz DEFAULT now() NOT NULL,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships (id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.scholarship_applications (id) ON DELETE SET NULL,
  award_year integer,
  recipient_name text,
  recipient_school text,
  recipient_grad_year integer,
  award_amount_cents integer,
  public_citation text,
  recipient_photo_url text,
  is_public boolean DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scholarship_awards_scholarship ON public.scholarship_awards (scholarship_id);

CREATE TABLE IF NOT EXISTS public.scholarship_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships (id) ON DELETE CASCADE,
  donor_name text,
  donor_email text,
  amount_cents integer NOT NULL,
  display_name text,
  stripe_payment_id text,
  receipt_sent boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scholarship_donations_scholarship ON public.scholarship_donations (scholarship_id);

CREATE TABLE IF NOT EXISTS public.scholarship_reviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id uuid NOT NULL REFERENCES public.scholarships (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL,
  name text,
  email text,
  added_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT scholarship_reviewers_role_chk CHECK (role IN ('family', 'committee', 'admin')),
  UNIQUE (scholarship_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_scholarship_reviewers_user ON public.scholarship_reviewers (user_id);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_reviewers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scholarships_select_public ON public.scholarships;
DROP POLICY IF EXISTS scholarship_awards_select_public ON public.scholarship_awards;
DROP POLICY IF EXISTS scholarship_applications_insert_public ON public.scholarship_applications;
DROP POLICY IF EXISTS scholarship_reviews_deny_all ON public.scholarship_reviews;
DROP POLICY IF EXISTS scholarship_donations_deny_all ON public.scholarship_donations;
DROP POLICY IF EXISTS scholarship_reviewers_deny_all ON public.scholarship_reviewers;

CREATE POLICY scholarships_select_public ON public.scholarships FOR SELECT USING (true);

CREATE POLICY scholarship_awards_select_public ON public.scholarship_awards FOR SELECT USING (is_public = true);

CREATE POLICY scholarship_applications_insert_public ON public.scholarship_applications FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.scholarships s WHERE s.id = scholarship_id));

CREATE POLICY scholarship_reviews_deny_all ON public.scholarship_reviews FOR ALL USING (false);

CREATE POLICY scholarship_donations_deny_all ON public.scholarship_donations FOR ALL USING (false);

CREATE POLICY scholarship_reviewers_deny_all ON public.scholarship_reviewers FOR ALL USING (false);

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
  'applications_open',
  NULL, NULL, NULL, NULL,
  'Perry family'
)
ON CONFLICT (slug) DO NOTHING;
