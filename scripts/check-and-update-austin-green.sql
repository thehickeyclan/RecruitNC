-- Check and update Austin Green's commitment date
-- Since the home page now uses updated_at as fallback, we update both commitmentdate and updated_at

-- First, check if Austin Green exists
SELECT 
  id,
  name,
  highschool,
  college,
  division,
  graduationyear,
  commitmentdate,
  created_at,
  updated_at
FROM athletes
WHERE name ILIKE '%Austin%Green%'
   OR name ILIKE '%Green%Austin%';

-- If Austin Green exists, update his commitment date to today
-- This will make him appear as the most recent commit
UPDATE athletes
SET 
  commitmentdate = CURRENT_DATE,
  updated_at = NOW()
WHERE name ILIKE '%Austin%Green%'
   OR name ILIKE '%Green%Austin%'
RETURNING id, name, college, commitmentdate, updated_at;

-- Show the top 10 most recent commitments (by updated_at) to verify Austin is now first
-- This matches the new API logic that uses updated_at as fallback
SELECT 
  name,
  highschool,
  college,
  graduationyear,
  commitmentdate,
  updated_at,
  COALESCE(commitmentdate, updated_at) as display_date
FROM athletes
WHERE college IS NOT NULL 
  AND college != ''
  AND graduationyear >= 2026
ORDER BY updated_at DESC
LIMIT 10;

-- Check how many athletes are missing commitmentdate (these will use updated_at)
SELECT 
  COUNT(*) as total_commitments,
  COUNT(CASE WHEN commitmentdate IS NOT NULL THEN 1 END) as has_commit_date,
  COUNT(CASE WHEN commitmentdate IS NULL THEN 1 END) as missing_commit_date
FROM athletes
WHERE college IS NOT NULL 
  AND college != ''
  AND graduationyear >= 2026;

