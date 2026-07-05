-- Fix: "new row violates row-level security policy for table data_dawg_feedback"
-- The table was created with RLS enabled but no policies. Run once in Supabase → SQL Editor.

ALTER TABLE public.data_dawg_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_dawg_feedback_public_insert ON public.data_dawg_feedback;
DROP POLICY IF EXISTS data_dawg_feedback_service_role_all ON public.data_dawg_feedback;

-- Public feedback submissions (Hey Data Dawg). No public read/update/delete.
CREATE POLICY data_dawg_feedback_public_insert
  ON public.data_dawg_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(correction_notes) >= 5
    AND char_length(correction_notes) <= 4000
  );

-- Server/admin API (service role). Explicit policy for environments that enforce RLS on all roles.
CREATE POLICY data_dawg_feedback_service_role_all
  ON public.data_dawg_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
