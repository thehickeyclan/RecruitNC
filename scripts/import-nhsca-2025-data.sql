-- Import NHSCA 2025 Data
-- Replace the VALUES section with your actual JSON data
-- This is a template - you'll need to convert your JSON to SQL INSERT statements

-- Example format (replace with your actual data):
INSERT INTO nhsca_placements (
  year,
  athlete_name,
  high_school,
  placement,
  weight_class,
  division,
  record,
  state
) VALUES
  (2025, 'Charlie Fogle', 'statesville', NULL, '106', 'Freshman', '3-2', 'NC'),
  (2025, 'Gavin Spell', 'Parkton', NULL, '106', 'Freshman', '0-2', 'NC'),
  (2025, 'Lennon Ogden', 'Bailey', NULL, '106', 'Freshman', '0-2', 'NC'),
  (2025, 'Connor Reece Oak', 'Ridge', 7, '132', 'Freshman', '5-2', 'NC'),
  (2025, 'Mitchell Rowland', 'Carthage', 8, '132', 'Freshman', '5-3', 'NC'),
  -- ... add all your entries here
  (2025, 'Liam Hickey', 'Raleigh', 4, '126', 'Senior', '6-2', 'NC'),
  (2025, 'Colt Campbell', 'MIDLAND', 3, '170', 'Senior', '6-1', 'NC')
  -- Continue with all entries from your JSON
ON CONFLICT DO NOTHING;

-- After import, verify:
SELECT 
  COUNT(*) as total_imported,
  COUNT(placement) as placers,
  COUNT(*) - COUNT(placement) as non_placers
FROM nhsca_placements
WHERE year = 2025;

