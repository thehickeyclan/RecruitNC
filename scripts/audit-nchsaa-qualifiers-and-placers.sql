-- =============================================================================
-- Audit: public.wrestling_nchsaa_results
-- Confirms state QUALIFIERS (place = 0) and PLACERS (place >= 1) are loaded.
-- Read-only — safe to run in Supabase SQL Editor.
--
-- RecruitNC rules:
--   place = 0     → State Qualifier (SQ): made states, did not place top-4 (2026+) / top-8 (older)
--   place = 1–4   → Placers (2026+ men’s format, four medals per weight)
--   place = 1–8   → Placers (2025 and earlier, common)
--
-- 2026 men’s reference totals (official NCHSAA — see docs/2026-state-qualifier-data.md):
--   ~360 rows with place IN (1,2,3,4)  +  ~451 rows with place = 0  ≈  ~811 total men’s rows
--   (Plus women’s rows if you load classification '1-4A'.)
-- =============================================================================

-- ---- 1) Quick health: rows missing place (NULL breaks profile display)
SELECT
  'rows_with_place_null' AS check_name,
  count(*)::bigint AS cnt
FROM public.wrestling_nchsaa_results
WHERE place IS NULL;

-- ---- 2) By tournament year: total rows, qualifiers (SQ), placers
SELECT
  year,
  count(*)::bigint AS total_rows,
  count(*) FILTER (WHERE place = 0)::bigint AS state_qualifiers_sq,
  count(*) FILTER (WHERE place IS NOT NULL AND place >= 1)::bigint AS placers,
  count(*) FILTER (WHERE place IS NULL)::bigint AS bad_null_place
FROM public.wrestling_nchsaa_results
GROUP BY year
ORDER BY year DESC;

-- ---- 3) 2026 only — men’s classifications (SQ vs placers per class)
WITH men_2026 AS (
  SELECT *
  FROM public.wrestling_nchsaa_results
  WHERE year = 2026
    AND classification IN ('1A/2A', '3A', '4A', '5A', '6A', '7A', '8A')
)
SELECT
  classification,
  count(*)::bigint AS total_rows,
  count(*) FILTER (WHERE place = 0)::bigint AS sq,
  count(*) FILTER (WHERE place IN (1, 2, 3, 4))::bigint AS placers_1_to_4,
  count(*) FILTER (WHERE place IS NOT NULL AND place NOT IN (0, 1, 2, 3, 4))::bigint AS unexpected_place_values
FROM men_2026
GROUP BY classification
ORDER BY classification;

-- ---- 4) 2026 men’s rollup (compare to ~811 total / ~451 SQ / ~360 placers)
SELECT
  count(*)::bigint AS mens_2026_total,
  count(*) FILTER (WHERE place = 0)::bigint AS mens_2026_sq,
  count(*) FILTER (WHERE place IN (1, 2, 3, 4))::bigint AS mens_2026_placers_1_to_4
FROM public.wrestling_nchsaa_results
WHERE year = 2026
  AND classification IN ('1A/2A', '3A', '4A', '5A', '6A', '7A', '8A');

-- ---- 5) 2026 women’s (if loaded): classification often '1-4A'
SELECT
  count(*)::bigint AS womens_2026_total,
  count(*) FILTER (WHERE place = 0)::bigint AS womens_2026_sq,
  count(*) FILTER (WHERE place >= 1)::bigint AS womens_2026_placers
FROM public.wrestling_nchsaa_results
WHERE year = 2026
  AND classification = '1-4A';

-- ---- 6) Duplicate keys (same year / class / weight / name should be unique)
SELECT
  year,
  classification,
  weight_class,
  wrestler_name,
  count(*)::bigint AS row_count
FROM public.wrestling_nchsaa_results
GROUP BY year, classification, weight_class, wrestler_name
HAVING count(*) > 1
ORDER BY year DESC, classification, weight_class, wrestler_name
LIMIT 200;

-- ---- 7) Full export-style list: 2026 state QUALIFIERS only (place = 0) — men’s classes
SELECT
  year,
  classification,
  weight_class,
  place,
  wrestler_name,
  school,
  qualifying_tournament,
  qualifying_place
FROM public.wrestling_nchsaa_results
WHERE year = 2026
  AND place = 0
  AND classification IN ('1A/2A', '3A', '4A', '5A', '6A', '7A', '8A')
ORDER BY classification, weight_class::text, wrestler_name;

-- ---- 8) Spot-check (uncomment and edit)
-- SELECT year, classification, weight_class, place, wrestler_name, school
-- FROM public.wrestling_nchsaa_results
-- WHERE year = 2026
--   AND (
--     wrestler_name ILIKE '%Hickey%Gavin%'
--     OR wrestler_name ILIKE '%Gavin%Hickey%'
--   )
-- ORDER BY weight_class;
