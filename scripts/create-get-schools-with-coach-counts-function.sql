-- Create a PostgreSQL function to get schools with coach counts
CREATE OR REPLACE FUNCTION get_schools_with_coach_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMPTZ,
  coach_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.logo_url,
    s.primary_color,
    s.secondary_color,
    s.created_at,
    COUNT(up.id) AS coach_count
  FROM schools s
  LEFT JOIN user_profiles up ON up.school_id = s.id 
    AND up.role IN ('coach', 'college_coach')
  GROUP BY s.id, s.name, s.logo_url, s.primary_color, s.secondary_color, s.created_at
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;
