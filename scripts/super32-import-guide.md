# Super 32 NC Results – Import Guide

## Critical: High school is not city

**Super 32’s source data does not include high school** – it often has city/location only. **Do not use city as high school.**

- **Data Dawg and search** rely on `high_school` in `super32_results`. Users search by **athlete** or **high school** and see results across NHSCA, Super 32, NCHSAA, etc.
- If we store city (e.g. "Newland", "Greensboro") in `high_school`, then:
  - Search for "Robbinsville" won’t show Super 32 for a Robbinsville athlete whose row says "Newland".
  - We’d be wrong or incomplete and would break the value we add: **we assign high school using other data** (athletes table, NHSCA, NCHSAA, etc.) when Super 32 doesn’t provide it.

**Rule:** Resolve each Super 32 row to the **athlete’s actual high school** from our system, then write that to `super32_results.high_school`. Never write raw "city" into `high_school`.

---

## Source files

- **2022:** `scripts/super32-nc-records-2022.csv` — compare: `GET /api/debug/compare-super32-2022`
- **2023:** `scripts/super32-nc-records-2023.csv` — compare: `GET /api/debug/compare-super32-2023`

**Columns:** `year`, `athlete_name`, `weight_class`, `wins`, `losses`, `record`, `city_from_source`

`city_from_source` is **reference only** (e.g. for disambiguation or manual checks). It must **not** be written to `high_school`.

---

## Import process (safe for Data Dawg and search)

1. **Resolve high school per row**
   - For each row: match `athlete_name` (+ `year` / `weight_class` if needed) to **our** data:
     - Prefer: `athletes` table (e.g. by name + graduation year or weight).
     - Or: `nhsca_placements` / `wrestling_nhsca_results` (they have `high_school` / `athlete_name`).
     - Or: NCHSAA / rankings data that has school.
   - Set `high_school` = the **resolved** school name (same style as in `athletes.highschool` so search and filters work).
   - If you cannot resolve with confidence, leave that row out of the import or flag for manual review – **do not** use `city_from_source` as `high_school`.

2. **Write to `super32_results`**
   - Insert/upsert only with: `athlete_name`, `year`, `weight_class`, `wins`, `losses`, `record`, and the **resolved** `high_school` (and `school` if your schema uses it the same way).
   - Do **not** populate `high_school` from the CSV’s city column.

3. **Result**
   - Profiles: unified profile matches by `athlete_name` + `year` and filters by `high_school` when present, so only the correct athlete’s Super 32 shows.
   - Data Dawg / search: queries by athlete or high school return correct Super 32 (and NHSCA, etc.) because `high_school` is aligned with the rest of our data.

---

## Table: `super32_results`

Use (at least): `athlete_name`, `year`, `record`, `wins`, `losses`, `weight_class`, `high_school`.  
`high_school` must be the **resolved** school from our system, not city from the source list.

---

## Accuracy: high schools, weights, and records

You get **accurate** Super32 data only if you follow this process. The app does not auto-correct; it displays whatever is in `super32_results`.

| Data | How to get it accurate |
|------|------------------------|
| **High school** | **Resolve from our data** (athletes, NHSCA, NCHSAA). Never use Super32’s city/location as `high_school`. Match by name (+ year/weight if needed) and set `high_school` to the school we use elsewhere. |
| **Weight** | Use the **authoritative CSV** (or official list). When comparing CSV vs DB, fix any `weight_class` mismatches so DB matches the source. |
| **Record** | Use the **authoritative CSV** for `record`, `wins`, and `losses`. Run the compare (e.g. `GET /api/debug/compare-super32-2022`) and apply the **Reconciliation** SQL so `super32_results` matches the CSV. |

Checklist:

1. **Import / backfill:** For every row, set `high_school` from athletes or NHSCA/NCHSAA (never from city).
2. **Weights:** Copy `weight_class` from the authoritative list; fix any errors found in the compare report.
3. **Records:** Run compare, then run the reconciliation `UPDATE` statements so `record`, `wins`, and `losses` match the authoritative list.

If you do all of the above, high schools, weights, and records in `super32_results` will be accurate.

---

## Summary

| Do | Don’t |
|----|--------|
| Resolve high school from athletes / NHSCA / NCHSAA (or other internal data) | Use city from the source as `high_school` |
| Keep `high_school` consistent with `athletes.highschool` and NHSCA/NCHSAA | Import without resolving and hope city “is close enough” |
| Skip or flag rows you can’t resolve | Guess or use city and break search / Data Dawg |

Our value: Super 32 doesn’t capture high school; we **assign** it from other data so athlete and high-school search stay correct across NHSCA, Super 32, and the rest.

---

## Compare 2022 list vs database (before/after import)

To see how the authoritative 2022 CSV differs from what's in the DB:

**Request:** `GET /api/debug/compare-super32-2022`

**Response:**

- **summary** – Counts: csvTotal, dbTotal, onlyInCsvCount, onlyInDbCount, matchedCount, fieldDifferencesCount.
- **onlyInCsv** – Rows in the CSV that have no match in the DB (by name + weight). These are missing in the DB.
- **onlyInDb** – Rows in the DB (year 2022) that have no match in the CSV. These may be wrong or from another source.
- **fieldDifferences** – Rows that match (name + weight) but differ on record, wins, or losses.

Match key is normalized athlete name + weight_class. Use this report to clean or backfill `super32_results` for 2022.

---

## Reconciliation: Using the compare report

After you run the compare (e.g. `GET /api/debug/compare-super32-2022` or a similar comparison for another year), use the report like this.

### 1. Field differences (record / wins / losses)

Treat the **CSV as source of truth**. Update `super32_results` so `record`, `wins`, and `losses` match the CSV for each matched name + weight_class.

Example SQL for **2022** (the compare is `compare-super32-2022`):

```sql
-- Fix record/wins/losses from CSV (2022)
UPDATE super32_results SET record = '3-2', wins = 3, losses = 2
WHERE year = 2022 AND LOWER(TRIM(athlete_name)) = 'damon landreth' AND weight_class = '126';

UPDATE super32_results SET record = '4-2', wins = 4, losses = 2
WHERE year = 2022 AND LOWER(TRIM(athlete_name)) = 'aldo hernandez' AND weight_class = '132';

UPDATE super32_results SET record = '0-2', wins = 0, losses = 2
WHERE year = 2022 AND LOWER(TRIM(athlete_name)) = 'xander hill' AND weight_class = '152';

UPDATE super32_results SET record = '0-2', wins = 0, losses = 2
WHERE year = 2022 AND LOWER(TRIM(athlete_name)) = 'elijah brown' AND weight_class = '170';

UPDATE super32_results SET record = '2-1', wins = 2, losses = 1
WHERE year = 2022 AND LOWER(TRIM(athlete_name)) = 'jackson buck' AND weight_class = '182';

UPDATE super32_results SET record = '0-2', wins = 0, losses = 2
WHERE year = 2022 AND LOWER(TRIM(athlete_name)) = 'andrew kehoe' AND weight_class = '182';

UPDATE super32_results SET record = '0-2', wins = 0, losses = 2
WHERE year = 2022 AND LOWER(TRIM(athlete_name)) = 'matthew cranfill' AND weight_class = '220';
```

### 2. Only in CSV

These rows are in the CSV but not in the DB (name + weight didn’t match). Either:

- **Add** them: `INSERT INTO super32_results (year, athlete_name, weight_class, record, wins, losses, high_school, ...)`  
  Set `high_school` from **our** data (athletes/NHSCA/NCHSAA), **not** from CSV `city_from_source`.
- Or **link** to an existing DB row if it’s the same person with a different spelling (e.g. "Mark Brown iii" vs "Mark Brown"); then fix the name in DB or add an alias; resolve school from our data.

### 3. Only in DB

These rows are in the DB but not in the CSV. Either:

- **Keep** them if they’re valid (e.g. from another source or a different bracket).
- **Remove** them if they’re duplicates or wrong:  
  `DELETE FROM super32_results WHERE year = YEAR AND athlete_name = '...' AND weight_class = '...';`  
  Only do this after you’re sure the CSV is the single source of truth for that year.
