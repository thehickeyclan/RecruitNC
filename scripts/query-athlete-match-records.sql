-- Query Examples for Athlete Match Data and Season Records
-- Use these queries to answer questions like:
-- - "What was Tobin McNair's record as a freshman?"
-- - "What losses did Liam Hickey have in his high school career?"
-- - "What was Colt Campbell's HS career record?"

-- ============================================================================
-- QUERY 1: Get season record for a specific grade/year
-- Example: "What was Tobin McNair's record as a freshman?"
-- ============================================================================
SELECT 
  first_name,
  last_name,
  season,
  grade,
  high_school,
  wins,
  losses,
  total_matches,
  wins || '-' || losses as record,
  CASE 
    WHEN total_matches > 0 
    THEN ROUND((wins::DECIMAL / total_matches) * 100, 1) 
    ELSE 0 
  END as win_percentage,
  pins,
  tech_falls,
  decisions,
  major_decisions
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%tobin%mcnair%'
  AND LOWER(grade) IN ('freshman', '9', 'fr')
ORDER BY season DESC
LIMIT 1;

-- ============================================================================
-- QUERY 2: Get all losses from individual matches across all seasons
-- Example: "What losses did Liam Hickey have in his high school career?"
-- ============================================================================
SELECT 
  m.first_name,
  m.last_name,
  m.season,
  m.grade,
  m.high_school,
  match->>'date' as match_date,
  match->>'weight' as weight,
  COALESCE(match->>'opponent', match->>'opponent_name') as opponent,
  match->>'opponent_school' as opponent_school,
  match->>'method' as method,
  COALESCE(match->>'venue', match->>'tournament') as venue,
  match->>'opponent_percentage' as opponent_percentage
FROM matches m,
  jsonb_array_elements(m.matches) as match
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%liam%hickey%'
  AND (
    match->>'win_loss' = 'L' 
    OR match->>'result' ILIKE '%loss%'
    OR (match->>'win_loss' IS NULL AND match->>'result' ILIKE '%loss%')
  )
ORDER BY 
  m.season DESC,
  (match->>'date') DESC NULLS LAST;

-- ============================================================================
-- QUERY 3: Get career totals across all seasons (all 4 years)
-- Example: "What was Colt Campbell's HS career record?"
-- ============================================================================
SELECT 
  first_name,
  last_name,
  high_school,
  COUNT(DISTINCT season) as seasons_competed,
  SUM(wins) as career_wins,
  SUM(losses) as career_losses,
  SUM(total_matches) as career_total_matches,
  SUM(wins) || '-' || SUM(losses) as career_record,
  SUM(pins) as career_pins,
  SUM(tech_falls) as career_tech_falls,
  SUM(decisions) as career_decisions,
  SUM(major_decisions) as career_major_decisions,
  CASE 
    WHEN SUM(total_matches) > 0 
    THEN ROUND((SUM(wins)::DECIMAL / SUM(total_matches)) * 100, 1) 
    ELSE 0 
  END as career_win_percentage,
  CASE 
    WHEN SUM(total_matches) > 0 
    THEN ROUND((SUM(pins)::DECIMAL / SUM(total_matches)) * 100, 1) 
    ELSE 0 
  END as career_pin_percentage,
  -- Individual season breakdown
  jsonb_agg(
    jsonb_build_object(
      'season', season,
      'grade', grade,
      'wins', wins,
      'losses', losses,
      'total_matches', total_matches,
      'record', wins || '-' || losses
    ) ORDER BY season
  ) as season_breakdown
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%colt%campbell%'
GROUP BY first_name, last_name, high_school
ORDER BY first_name, last_name;

-- ============================================================================
-- QUERY 4: Get all seasons for an athlete with detailed stats
-- ============================================================================
SELECT 
  season,
  grade,
  high_school,
  wins,
  losses,
  total_matches,
  wins || '-' || losses as record,
  CASE 
    WHEN total_matches > 0 
    THEN ROUND((wins::DECIMAL / total_matches) * 100, 1) 
    ELSE 0 
  END as win_percentage,
  pins,
  tech_falls,
  decisions,
  major_decisions,
  pin_percentage,
  tf_percentage,
  finishing_percentage
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%athlete_name%'
ORDER BY 
  CASE grade
    WHEN 'Freshman' THEN 1
    WHEN '9' THEN 1
    WHEN 'Fr' THEN 1
    WHEN 'Sophomore' THEN 2
    WHEN '10' THEN 2
    WHEN 'So' THEN 2
    WHEN 'Junior' THEN 3
    WHEN '11' THEN 3
    WHEN 'Jr' THEN 3
    WHEN 'Senior' THEN 4
    WHEN '12' THEN 4
    WHEN 'Sr' THEN 4
    ELSE 0
  END,
  season;

-- ============================================================================
-- QUERY 5: Get all wins for an athlete
-- ============================================================================
SELECT 
  m.first_name,
  m.last_name,
  m.season,
  m.grade,
  match->>'date' as match_date,
  match->>'weight' as weight,
  COALESCE(match->>'opponent', match->>'opponent_name') as opponent,
  match->>'opponent_school' as opponent_school,
  match->>'method' as method,
  COALESCE(match->>'venue', match->>'tournament') as venue,
  match->>'opponent_percentage' as opponent_percentage
FROM matches m,
  jsonb_array_elements(m.matches) as match
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%athlete_name%'
  AND (
    match->>'win_loss' = 'W' 
    OR match->>'result' ILIKE '%win%'
  )
ORDER BY 
  m.season DESC,
  (match->>'date') DESC NULLS LAST;

-- ============================================================================
-- QUERY 6: Simple career record summary
-- ============================================================================
SELECT 
  first_name,
  last_name,
  high_school,
  SUM(wins) || '-' || SUM(losses) as career_record,
  SUM(wins) as career_wins,
  SUM(losses) as career_losses,
  SUM(total_matches) as career_matches
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%athlete_name%'
GROUP BY first_name, last_name, high_school;

-- ============================================================================
-- QUERY 7: Get record for a specific season
-- ============================================================================
SELECT 
  first_name,
  last_name,
  season,
  grade,
  high_school,
  wins || '-' || losses as record,
  wins,
  losses,
  total_matches,
  pins,
  tech_falls
FROM matches
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%athlete_name%'
  AND season = '2024-25'  -- Replace with desired season
ORDER BY season DESC;

-- ============================================================================
-- QUERY 8: Get all matches (wins and losses) for an athlete
-- ============================================================================
SELECT 
  m.first_name,
  m.last_name,
  m.season,
  m.grade,
  match->>'date' as match_date,
  match->>'weight' as weight,
  COALESCE(match->>'opponent', match->>'opponent_name') as opponent,
  match->>'opponent_school' as opponent_school,
  COALESCE(match->>'win_loss', 
    CASE 
      WHEN match->>'result' ILIKE '%win%' THEN 'W'
      WHEN match->>'result' ILIKE '%loss%' THEN 'L'
      ELSE NULL
    END
  ) as result,
  match->>'method' as method,
  COALESCE(match->>'venue', match->>'tournament') as venue,
  match->>'opponent_percentage' as opponent_percentage
FROM matches m,
  jsonb_array_elements(m.matches) as match
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%athlete_name%'
ORDER BY 
  m.season DESC,
  (match->>'date') DESC NULLS LAST;

-- ============================================================================
-- QUERY 9: Get matches linked to athlete profile (if athlete_id exists)
-- ============================================================================
SELECT 
  a.name as athlete_name,
  a.graduationyear,
  a.highschool,
  m.season,
  m.grade,
  m.wins,
  m.losses,
  m.total_matches,
  m.wins || '-' || m.losses as record
FROM matches m
JOIN athletes a ON a.id = m.athlete_id
WHERE LOWER(TRIM(a.name)) LIKE '%athlete_name%'
ORDER BY 
  CASE m.grade
    WHEN 'Freshman' THEN 1
    WHEN '9' THEN 1
    WHEN 'Fr' THEN 1
    WHEN 'Sophomore' THEN 2
    WHEN '10' THEN 2
    WHEN 'So' THEN 2
    WHEN 'Junior' THEN 3
    WHEN '11' THEN 3
    WHEN 'Jr' THEN 3
    WHEN 'Senior' THEN 4
    WHEN '12' THEN 4
    WHEN 'Sr' THEN 4
    ELSE 0
  END;

-- ============================================================================
-- QUERY 10: Get record by grade level (all athletes with that grade)
-- Example: Get all freshman records
-- ============================================================================
SELECT 
  first_name,
  last_name,
  high_school,
  season,
  wins || '-' || losses as record,
  wins,
  losses,
  total_matches
FROM matches
WHERE LOWER(grade) IN ('freshman', '9', 'fr')
ORDER BY wins DESC, losses ASC;

-- ============================================================================
-- QUERY 11: Get all losses with opponent details (enhanced)
-- ============================================================================
SELECT 
  m.first_name || ' ' || m.last_name as athlete_name,
  m.season,
  m.grade,
  match->>'date' as match_date,
  match->>'weight' as weight_class,
  COALESCE(match->>'opponent', match->>'opponent_name') as opponent_name,
  match->>'opponent_school' as opponent_school,
  match->>'method' as loss_method,
  COALESCE(match->>'venue', match->>'tournament') as event,
  match->>'opponent_percentage' as opponent_win_percentage,
  CASE 
    WHEN match->>'method' ILIKE '%pin%' OR match->>'method' ILIKE '%fall%' THEN 'Pin'
    WHEN match->>'method' ILIKE '%tech%' THEN 'Tech Fall'
    WHEN match->>'method' ILIKE '%major%' THEN 'Major Decision'
    WHEN match->>'method' ILIKE '%decision%' THEN 'Decision'
    ELSE match->>'method'
  END as loss_type
FROM matches m,
  jsonb_array_elements(m.matches) as match
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%athlete_name%'
  AND (
    match->>'win_loss' = 'L' 
    OR match->>'result' ILIKE '%loss%'
  )
ORDER BY 
  m.season DESC,
  (match->>'date') DESC NULLS LAST;




