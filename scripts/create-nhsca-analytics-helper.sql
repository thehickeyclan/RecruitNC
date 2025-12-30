-- Create a SQL function to get exact 2025 Senior count
-- This will be used to verify what the database actually has

CREATE OR REPLACE FUNCTION get_nhsca_2025_senior_count()
RETURNS TABLE (
  total_participants BIGINT,
  all_americans BIGINT,
  division_values TEXT[],
  sample_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_participants,
    COUNT(placement)::BIGINT as all_americans,
    ARRAY_AGG(DISTINCT division) FILTER (WHERE division IS NOT NULL) as division_values,
    ARRAY_AGG(athlete_name) FILTER (WHERE athlete_name IS NOT NULL)::TEXT[] as sample_names
  FROM nhsca_placements
  WHERE year = 2025
    AND state = 'NC'
    AND LOWER(TRIM(COALESCE(division, ''))) = 'senior';
END;
$$ LANGUAGE plpgsql;

