# School Classification (NCHSAA 1A–8A)

High school divisions use the **new 8-division structure** (1A–8A, plus 1A/2A for some schools).

## Sources

1. **`school_classifications`** (DB) – Authoritative source used by College Recruiting Guide, school-division-lookup, and AI tools.
   - Columns: `school_name`, `classification`, `region`, `enrollment`, `effective_year`, etc.
   - Allowed values: `1A`, `2A`, `3A`, `4A`, `5A`, `6A`, `7A`, `8A`, `1A/2A`

2. **`lib/classification-data.ts`** – Exports `findSchoolClassification()`, `buildSchoolClassificationMap()`.
   - Both query `school_classifications` table.
   - Use for any code that needs to resolve a school name → classification.

3. **`lib/school-division-lookup.ts`** – `getSchoolDivision(schoolName)` and `updateAthleteDivisionFromSchool()`.
   - Uses `classification-data.ts` under the hood.
   - Updates `athletes.high_school_division` when syncing.

## Adding schools

Run `scripts/add-school-classifications.sql` in Supabase SQL Editor to add or update classifications (e.g. Uwharrie Charter → 4A).

## Deprecated

- **`nc_school_divisions`** – Old 4-division (1A–4A) table. No longer used.
- **`highSchoolLogoUrl`** – Previously stored division; now prefer `high_school_division`.
