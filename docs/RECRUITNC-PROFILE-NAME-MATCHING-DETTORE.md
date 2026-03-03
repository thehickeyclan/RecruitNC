# RecruitNC profile name matching (align with Data Dawg)

Same DB and tables as LegacyNC (Data Dawg): `wrestling_nchsaa_results`, `wrestling_nhsca_results`, `nhsca_placements`, `super32_results`. Data Dawg finds Jackson D'Ettore (and similar names) because it queries with **multiple name variants**. RecruitNC profile must do the same.

## Cause

- **Profile** loads tournament data by `athlete.name` (e.g. `"Jackson D'Ettore"`).
- **DB** may store NCHSAA as **"D'Ettore, Jackson"** (Last, First) or with **backtick** (`D\`Ettore`) instead of apostrophe.
- A single strict match on the display name can miss those rows → blank NCHSAA/NHSCA/Super32 on the profile.

## What RecruitNC does (aligned with Data Dawg)

1. **Name variants** (`lib/tournament-tables.ts` `getNameVariants`, `lib/nchsaa-results.ts` `getNameVariations`):
   - Apostrophe and no-apostrophe: `D'Ettore` / `Dettore`.
   - Curly apostrophe (U+2019) normalized to straight.
   - **"Last, First"** when we have "First Last": e.g. `"D'Ettore, Jackson"`.
   - Backtick variant in **ILIKE patterns** so DB `"D\`Ettore, Jackson"` matches.

2. **Exact match first**, then ILIKE over variants:
   - Try `.eq("athlete_name", exactName)` / `.eq("wrestler_name", exactName)` for "First Last".
   - Try `.eq(..., lastFirst)` for the "Last, First" variant when present.
   - Then try all variants with **ILIKE** patterns: straight quote, curly quote, and **backtick** (so `'` → `` ` `` in pattern).

3. **Tables queried**:
   - `wrestling_nchsaa_results.wrestler_name`
   - `nhsca_placements.athlete_name`, `wrestling_nhsca_results.athlete_name`
   - `super32_results.athlete_name`

4. **Code**:
   - Tournament fetchers: `lib/tournament-tables.ts` (`getNHSCAFromTables`, `getSuper32FromTable`) and `lib/nchsaa-results.ts` (`getNCHSAAResultsForProfile`).
   - Profile data: `GET /api/athlete/[id]` (NHSCA, Super32) and `GET /api/wrestling-achievements` (NCHSAA), both use these fetchers with the same variant/pattern logic.

With this, RecruitNC profile name matching mirrors Data Dawg and fills NCHSAA, NHSCA, and Super32 for Jackson D'Ettore and similar names (apostrophe, backtick, "Last, First").
