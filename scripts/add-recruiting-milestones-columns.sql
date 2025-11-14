-- Add recruiting milestone tracking columns to college_coach_stars table
-- These track key events in the recruiting process

-- Check if columns already exist before adding
DO $$ 
BEGIN
  -- First Contact
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'first_contact_date') THEN
    ALTER TABLE college_coach_stars ADD COLUMN first_contact_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'first_contact_method') THEN
    ALTER TABLE college_coach_stars ADD COLUMN first_contact_method TEXT; -- email, phone, text, in-person, camp
  END IF;

  -- Application
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'has_applied') THEN
    ALTER TABLE college_coach_stars ADD COLUMN has_applied BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'applied_date') THEN
    ALTER TABLE college_coach_stars ADD COLUMN applied_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Campus Visit
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'campus_visit_date') THEN
    ALTER TABLE college_coach_stars ADD COLUMN campus_visit_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'campus_visit_type') THEN
    ALTER TABLE college_coach_stars ADD COLUMN campus_visit_type TEXT; -- unofficial, official
  END IF;

  -- Official Visit
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'official_visit_date') THEN
    ALTER TABLE college_coach_stars ADD COLUMN official_visit_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Financial Aid Package
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'financial_package_sent') THEN
    ALTER TABLE college_coach_stars ADD COLUMN financial_package_sent BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'package_sent_date') THEN
    ALTER TABLE college_coach_stars ADD COLUMN package_sent_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'package_amount') THEN
    ALTER TABLE college_coach_stars ADD COLUMN package_amount NUMERIC(10,2); -- Total aid offered
  END IF;

  -- Offer
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'offer_extended') THEN
    ALTER TABLE college_coach_stars ADD COLUMN offer_extended BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'offer_date') THEN
    ALTER TABLE college_coach_stars ADD COLUMN offer_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'offer_details') THEN
    ALTER TABLE college_coach_stars ADD COLUMN offer_details TEXT;
  END IF;

  -- Commitment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'committed_date') THEN
    ALTER TABLE college_coach_stars ADD COLUMN committed_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Signed NLI
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'nli_signed_date') THEN
    ALTER TABLE college_coach_stars ADD COLUMN nli_signed_date TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Communication Log (JSONB for flexibility)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'communication_log') THEN
    ALTER TABLE college_coach_stars ADD COLUMN communication_log JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Recruiting Notes (separate from financial notes)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'college_coach_stars' AND column_name = 'recruiting_notes') THEN
    ALTER TABLE college_coach_stars ADD COLUMN recruiting_notes TEXT;
  END IF;

END $$;

-- Create index for filtering by application status
CREATE INDEX IF NOT EXISTS idx_coach_stars_has_applied ON college_coach_stars(has_applied);
CREATE INDEX IF NOT EXISTS idx_coach_stars_financial_package_sent ON college_coach_stars(financial_package_sent);
CREATE INDEX IF NOT EXISTS idx_coach_stars_offer_extended ON college_coach_stars(offer_extended);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'college_coach_stars'
AND column_name IN (
  'first_contact_date', 'first_contact_method',
  'has_applied', 'applied_date',
  'campus_visit_date', 'campus_visit_type',
  'official_visit_date',
  'financial_package_sent', 'package_sent_date', 'package_amount',
  'offer_extended', 'offer_date', 'offer_details',
  'committed_date', 'nli_signed_date',
  'communication_log', 'recruiting_notes'
)
ORDER BY column_name;
