-- Check 1: Does the prospect_rankings table exist?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'prospect_rankings'
) AS prospect_rankings_table_exists;

-- Check 2: How many athletes have prospect_ranking set in the athletes table?
SELECT 
  graduationyear,
  gender,
  COUNT(*) as total_ranked,
  MIN(prospect_ranking) as min_rank,
  MAX(prospect_ranking) as max_rank
FROM athletes
WHERE prospect_ranking IS NOT NULL
GROUP BY graduationyear, gender
ORDER BY graduationyear DESC, gender;

-- Check 3: Sample of ranked athletes (who is currently ranked?)
SELECT 
  id,
  name,
  graduationyear,
  gender,
  prospect_ranking,
  highschool,
  weightclass
FROM athletes
WHERE prospect_ranking IS NOT NULL
ORDER BY graduationyear DESC, prospect_ranking ASC
LIMIT 20;

-- Check 4: If prospect_rankings table exists, what's in it?
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prospect_rankings') THEN
    RAISE NOTICE 'prospect_rankings table exists, checking contents...';
  END IF;
END $$;
