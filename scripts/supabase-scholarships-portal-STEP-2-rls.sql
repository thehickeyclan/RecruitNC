-- STEP 2 OF 3 — Row Level Security (run after STEP 1 succeeds).

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
