# Super 32 NC Results – Import Guide

## Critical: High school is not city

**Super 32’s source data does not include high school** – it often has city/location only. **Do not use city as high school.**

- **Data Dawg and search** rely on `high_school` in `super32_results`. Users search by **athlete** or **high school** and see results across NHSCA, Super 32, NCHSAA, etc.
- If we store city (e.g. "Newland", "Greensboro") in `high_school`, then:
  - Search for "Robbinsville" won’t show Super 32 for a Robbinsville athlete whose row says "Newland".
  - We’d be wrong or incomplete and would break the value we add: **we assign high school using other data** (athletes table, NHSCA, NCHSAA, etc.) when Super 32 doesn’t provide it.

**Rule:** Resolve each Super 32 row to the **athlete’s actual high school** from our system, then write that to `super32_results.high_school`. Never write raw "city" into `high_school`.

---

## Source file

- **File:** `scripts/super32-nc-records-2022.csv`
- **Year:** 2022
- **Columns:** `year`, `athlete_name`, `weight_class`, `wins`, `losses`, `record`, `city_from_source`

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
