-- Add Flo Wrestling and Track Wrestling profile URL columns to athletes table
-- This allows athletes to link to their profiles on these platforms

-- Add flo_profile_url column
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS flo_profile_url TEXT;

-- Add track_wrestling_profile_url column
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS track_wrestling_profile_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN athletes.flo_profile_url IS 'URL to athlete profile on Flo Wrestling (flowrestling.org)';
COMMENT ON COLUMN athletes.track_wrestling_profile_url IS 'URL to athlete profile on Track Wrestling (trackwrestling.com)';

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'athletes' 
  AND column_name IN ('flo_profile_url', 'track_wrestling_profile_url')
ORDER BY column_name;

