-- Simple fix: Just add Kavan to Reinhardt portal
-- Run this in Supabase SQL Editor

-- Delete any existing entries for Kavan that aren't with Reinhardt coaches
DELETE FROM college_coach_stars ccs
USING athletes a
WHERE ccs.athlete_id = a.id
  AND a.name ILIKE '%Kavan Wilson%'
  AND ccs.coach_user_id NOT IN (
    SELECT up.user_id 
    FROM user_profiles up
    JOIN schools s ON s.id = up.school_id
    WHERE s.name ILIKE '%Reinhardt%'
  );

-- Insert new entry with a Reinhardt coach
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
  up.user_id,
  a.id,
  'Committed',
  'high',
  'Committed to Reinhardt University',
  NOW(),
  NOW()
FROM athletes a
CROSS JOIN user_profiles up
JOIN schools s ON s.id = up.school_id
WHERE a.name ILIKE '%Kavan Wilson%'
  AND s.name ILIKE '%Reinhardt%'
  AND NOT EXISTS (
    SELECT 1 FROM college_coach_stars ccs2
    WHERE ccs2.athlete_id = a.id
      AND ccs2.coach_user_id = up.user_id
  )
LIMIT 1;

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

