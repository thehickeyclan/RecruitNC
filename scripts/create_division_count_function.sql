CREATE OR REPLACE FUNCTION get_division_counts()
RETURNS TABLE (division text, count bigint) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.division, 
    COUNT(*)::bigint
  FROM 
    athletes a
  WHERE 
    a.division IS NOT NULL 
    AND a.division != ''
  GROUP BY 
    a.division
  ORDER BY 
    COUNT(*) DESC;
END;
$$;
