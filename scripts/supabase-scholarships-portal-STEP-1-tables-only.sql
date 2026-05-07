-- STEP 1 OF 3 — Create tables only (run first in Supabase SQL Editor).
-- Must complete successfully before STEP 2 (RLS) and STEP 3 (seed).

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
