-- Create a function to update athlete divisions based on college patterns
CREATE OR REPLACE FUNCTION update_athlete_divisions(college_patterns text[], division_value text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE athletes
  SET division = division_value, updated_at = NOW()
  WHERE college ILIKE ANY(college_patterns);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
