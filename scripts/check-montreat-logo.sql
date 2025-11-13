-- Check if Montreat logo mappings exist
SELECT 
  entity_name,
  entity_type,
  logo_url,
  division,
  aliases,
  created_at
FROM logo_mappings
WHERE entity_name ILIKE '%montreat%' OR entity_type = 'college' AND logo_url LIKE '%Montreat%'
ORDER BY entity_name;

-- Check athletes with Montreat
SELECT 
  id,
  name,
  college,
  graduationyear
FROM athletes
WHERE college ILIKE '%montreat%'
ORDER BY name
LIMIT 5;
