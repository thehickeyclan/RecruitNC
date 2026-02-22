# Blue kids and their 2026 NCHSAA placement

Run in **Supabase → SQL Editor**. Copy the SQL below (do not copy the line with backticks).

**What it does:** List of active Blue members and their 2026 state result. One row per kid per weight; if they placed, that row is shown (not the SQ row).

```sql
WITH active_blue AS (
  SELECT a.id, a.name, a.highschool, a.graduationyear, a.weightclass
  FROM athletes a
  INNER JOIN blue_memberships m ON m.athlete_id = a.id
  WHERE m.status = 'active'
),
best_2026 AS (
  SELECT
    b.id, b.name, b.graduationyear, b.highschool, b.weightclass,
    r.year, r.classification, r.weight_class, r.place, r.school,
    ROW_NUMBER() OVER (
      PARTITION BY b.id, r.classification, r.weight_class
      ORDER BY CASE WHEN r.place = 0 OR r.place IS NULL THEN 999 ELSE r.place END
    ) AS rn
  FROM active_blue b
  INNER JOIN wrestling_nchsaa_results r
    ON r.year = 2026
   AND (r.wrestler_name ILIKE '%' || TRIM(b.name) || '%'
        OR (POSITION(' ' IN TRIM(b.name)) > 0
            AND r.wrestler_name ILIKE '%' || TRIM(SPLIT_PART(TRIM(b.name), ' ', 2)) || ', ' || TRIM(SPLIT_PART(TRIM(b.name), ' ', 1)) || '%'))
)
SELECT
  name AS member_name,
  graduationyear AS grad_year,
  highschool AS high_school,
  weightclass AS profile_weight,
  year AS state_year,
  classification AS state_classification,
  weight_class AS state_weight,
  CASE WHEN place = 0 OR place IS NULL THEN 'SQ' WHEN place = 1 THEN 'Champion' WHEN place = 2 THEN '2nd' WHEN place = 3 THEN '3rd' WHEN place = 4 THEN '4th' ELSE place::text || 'th' END AS placement,
  school AS state_school
FROM best_2026
WHERE rn = 1
ORDER BY name, weight_class, place NULLS LAST;
```
