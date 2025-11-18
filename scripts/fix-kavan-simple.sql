-- Simple fix: Just add Kavan to Reinhardt portal
-- Run this in Supabase SQL Editor

-- Step 1: Get Kavan's ID and a Reinhardt coach ID
WITH kavan AS (
  SELECT id, name, college 
  FROM athletes 
  WHERE name ILIKE '%Kavan Wilson%' 
  LIMIT 1
),
reinhardt_coach AS (
  SELECT up.user_id
  FROM user_profiles up
  JOIN schools s ON s.id = up.school_id
  WHERE s.name ILIKE '%Reinhardt%'
  LIMIT 1
)
-- Step 2: Insert or update the star entry
INSERT INTO college_coach_stars (
  coach_user_id,
  athlete_id,
  pipeline_stage,
  interest_level,
  notes,
  starred_at,
  committed_date
)
SELECT 
  rc.user_id,
  k.id,
  'Committed',
  'high',
  'Committed to Reinhardt University',
  NOW(),
  NOW()
FROM kavan k, reinhardt_coach rc
ON CONFLICT DO NOTHING;

-- If that didn't work (no conflict), try update
UPDATE college_coach_stars ccs
SET 
  pipeline_stage = 'Committed',
  interest_level = 'high',
  committed_date = NOW()
FROM athletes a
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
JOIN schools s ON s.id = up.school_id
WHERE a.name ILIKE '%Kavan Wilson%'
  AND ccs.athlete_id = a.id
  AND s.name ILIKE '%Reinhardt%';

-- Verify it worked
SELECT 
  a.name,
  a.college,
  ccs.pipeline_stage,
  s.name as school_name
FROM athletes a
JOIN college_coach_stars ccs ON ccs.athlete_id = a.id
JOIN user_profiles up ON up.user_id = ccs.coach_user_id
JOIN schools s ON s.id = up.school_id
WHERE a.name ILIKE '%Kavan Wilson%'
  AND s.name ILIKE '%Reinhardt%';

