-- Query to find where Liam Hickey's HS career summary for matches is stored
-- 
-- Career summary is stored in TWO places:
-- 1. athletes.career_record (TEXT) - Pre-calculated summary like "120-15"
-- 2. matches table - Can be calculated by summing all seasons

-- ============================================================================
-- OPTION 1: Get pre-calculated career record from athletes table
-- ============================================================================
SELECT 
  id,
  name,
  highschool,
  graduationyear,
  career_record as career_summary,
  college,
  division
FROM athletes
WHERE LOWER(TRIM(name)) LIKE '%liam%hickey%'
  OR LOWER(TRIM(name)) LIKE '%hickey%liam%';

-- ============================================================================
-- OPTION 2: Calculate career record from matches table (sum all seasons)
-- ============================================================================
SELECT 
  first_name,
  last_name,
  high_school,
  COUNT(DISTINCT season) as seasons_competed,
  SUM(wins) as career_wins,
  SUM(losses) as career_losses,
  SUM(total_matches) as career_total_matches,
  SUM(wins) || '-' || SUM(losses) as calculated_career_record,
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
WHERE LOWER(TRIM(first_name || ' ' || last_name)) LIKE '%liam%hickey%'
GROUP BY first_name, last_name, high_school;

-- ============================================================================
-- OPTION 3: Compare both sources (athletes table vs calculated from matches)
-- ============================================================================
SELECT 
  a.name as athlete_name,
  a.highschool,
  a.graduationyear,
  a.career_record as stored_career_record,
  COALESCE(
    (SELECT SUM(wins) || '-' || SUM(losses)
     FROM matches m
     WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%' || LOWER(TRIM(a.name)) || '%'
       OR m.athlete_id = a.id
     GROUP BY m.first_name, m.last_name),
    'No match data'
  ) as calculated_from_matches,
  CASE 
    WHEN a.career_record IS NOT NULL AND a.career_record != '' 
      THEN 'Stored in athletes table'
    ELSE 'Not stored'
  END as storage_status
FROM athletes a
WHERE LOWER(TRIM(a.name)) LIKE '%liam%hickey%'
  OR LOWER(TRIM(a.name)) LIKE '%hickey%liam%';

-- ============================================================================
-- OPTION 4: Get detailed career breakdown with all stats
-- ============================================================================
SELECT 
  m.first_name,
  m.last_name,
  m.high_school,
  -- Career totals
  SUM(m.wins) as career_wins,
  SUM(m.losses) as career_losses,
  SUM(m.total_matches) as career_matches,
  SUM(m.wins) || '-' || SUM(m.losses) as career_record,
  -- Career percentages
  CASE 
    WHEN SUM(m.total_matches) > 0 
    THEN ROUND((SUM(m.wins)::DECIMAL / SUM(m.total_matches)) * 100, 1) 
    ELSE 0 
  END as career_win_percentage,
  -- Career pins and tech falls
  SUM(m.pins) as career_pins,
  SUM(m.tech_falls) as career_tech_falls,
  -- Season-by-season breakdown
  jsonb_agg(
    jsonb_build_object(
      'season', m.season,
      'grade', m.grade,
      'wins', m.wins,
      'losses', m.losses,
      'total_matches', m.total_matches,
      'record', m.wins || '-' || m.losses,
      'pins', m.pins,
      'tech_falls', m.tech_falls
    ) ORDER BY m.season
  ) as all_seasons
FROM matches m
WHERE LOWER(TRIM(m.first_name || ' ' || m.last_name)) LIKE '%liam%hickey%'
GROUP BY m.first_name, m.last_name, m.high_school;





