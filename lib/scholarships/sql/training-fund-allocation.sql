-- Run once in Supabase SQL Editor after scholarships portal tables exist.
-- Enables recording transfers from the NC United Training Fund into named scholarship funds.
-- Each insert into scholarship_donations bumps scholarships.total_donated_cents (public hub totals).

ALTER TABLE public.scholarship_donations
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'donor_checkout' NOT NULL,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS allocated_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

UPDATE public.scholarship_donations SET source = 'donor_checkout' WHERE source IS NULL;

ALTER TABLE public.scholarship_donations DROP CONSTRAINT IF EXISTS scholarship_donations_source_chk;
ALTER TABLE public.scholarship_donations
  ADD CONSTRAINT scholarship_donations_source_chk CHECK (
    source IN ('donor_checkout', 'training_fund_allocation')
  );

CREATE OR REPLACE FUNCTION public.scholarship_donations_bump_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.scholarships
  SET total_donated_cents = total_donated_cents + NEW.amount_cents
  WHERE id = NEW.scholarship_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scholarship_donations_after_insert_bump_total ON public.scholarship_donations;
CREATE TRIGGER scholarship_donations_after_insert_bump_total
  AFTER INSERT ON public.scholarship_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.scholarship_donations_bump_total();
