-- SQL Functions for NHSCA Placement Matching
-- These functions handle automatic matching of placements to athlete profiles

-- Function 1: Match by exact name
CREATE OR REPLACE FUNCTION match_nhsca_exact_name(tournament_year INTEGER)
RETURNS TABLE(matched_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH matched AS (
    UPDATE nhsca_placements np
    SET 
      athlete_id = a.id,
      match_status = 'auto_matched',
      match_confidence = 1.0,
      match_method = 'exact_name',
      matched_at = NOW()
    FROM athletes a
    WHERE LOWER(TRIM(np.athlete_name)) = LOWER(TRIM(a.name))
      AND np.match_status = 'unmatched'
      AND np.year = tournament_year
    RETURNING np.id
  )
  SELECT COUNT(*)::INTEGER FROM matched;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Match by name + school
CREATE OR REPLACE FUNCTION match_nhsca_name_school(tournament_year INTEGER)
RETURNS TABLE(matched_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH matched AS (
    UPDATE nhsca_placements np
    SET 
      athlete_id = a.id,
      match_status = 'auto_matched',
      match_confidence = 0.95,
      match_method = 'name_school',
      matched_at = NOW()
    FROM athletes a
    WHERE LOWER(TRIM(np.athlete_name)) = LOWER(TRIM(a.name))
      AND LOWER(TRIM(np.high_school)) = LOWER(TRIM(a.highschool))
      AND np.match_status = 'unmatched'
      AND np.year = tournament_year
    RETURNING np.id
  )
  SELECT COUNT(*)::INTEGER FROM matched;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Match by name + weight class
CREATE OR REPLACE FUNCTION match_nhsca_name_weight(tournament_year INTEGER)
RETURNS TABLE(matched_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH matched AS (
    UPDATE nhsca_placements np
    SET 
      athlete_id = a.id,
      match_status = 'auto_matched',
      match_confidence = 0.85,
      match_method = 'name_weight',
      matched_at = NOW()
    FROM athletes a
    WHERE LOWER(TRIM(np.athlete_name)) = LOWER(TRIM(a.name))
      AND np.weight_class = a.weightclass
      AND np.match_status = 'unmatched'
      AND np.year = tournament_year
    RETURNING np.id
  )
  SELECT COUNT(*)::INTEGER FROM matched;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Merge matched placements into athlete profiles
CREATE OR REPLACE FUNCTION merge_nhsca_to_profiles(tournament_year INTEGER)
RETURNS TABLE(merged_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH merged AS (
    UPDATE athletes a
    SET nhsca_results = (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'year', np.year,
            'placement', 
              CASE np.placement
                WHEN 1 THEN 'Champion'
                WHEN 2 THEN 'Finalist'
                WHEN 3 THEN '3rd'
                WHEN 4 THEN '4th'
                WHEN 5 THEN '5th'
                WHEN 6 THEN '6th'
                WHEN 7 THEN '7th'
                WHEN 8 THEN '8th'
                ELSE np.placement::text
              END,
            'record', COALESCE(np.record, ''),
            'weight', np.weight_class,
            'division', np.division,
            'notes', COALESCE(np.notes, '')
          ) ORDER BY np.year DESC
        ),
        '[]'::jsonb
      )
      FROM nhsca_placements np
      WHERE np.athlete_id = a.id
        AND np.match_status IN ('auto_matched', 'manually_matched')
        AND np.merged_at IS NULL
        AND np.year = tournament_year
    )
    WHERE EXISTS (
      SELECT 1 FROM nhsca_placements np
      WHERE np.athlete_id = a.id
        AND np.match_status IN ('auto_matched', 'manually_matched')
        AND np.merged_at IS NULL
        AND np.year = tournament_year
    )
    RETURNING a.id
  )
  SELECT COUNT(*)::INTEGER FROM merged;
END;
$$ LANGUAGE plpgsql;

-- Function 5: Mark merged placements
CREATE OR REPLACE FUNCTION mark_nhsca_merged(tournament_year INTEGER)
RETURNS TABLE(marked_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  WITH marked AS (
    UPDATE nhsca_placements
    SET merged_at = NOW()
    WHERE match_status IN ('auto_matched', 'manually_matched')
      AND merged_at IS NULL
      AND year = tournament_year
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER FROM marked;
END;
$$ LANGUAGE plpgsql;

