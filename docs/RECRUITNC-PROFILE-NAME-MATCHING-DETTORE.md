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
   - **NCHSAA profile dual-token query:** `lib/nchsaa-profile-fetch.ts` (`fetchNchsaaResultsForAthleteProfile`) — merged inside `getNCHSAAResultsForProfile` (see subsection **2026 missing** below).
   - Profile data: `GET /api/athlete/[id]` (NHSCA, Super32) and `GET /api/wrestling-achievements` (NCHSAA), both use these fetchers with the same variant/pattern logic.

With this, RecruitNC profile name matching mirrors Data Dawg and fills NCHSAA, NHSCA, and Super32 for Jackson D'Ettore and similar names (apostrophe, backtick, "Last, First").

## 2026 missing (e.g. Ryan Thompson)

Two issues showed up on live profiles while **Legacy-only** fixes did not apply to RecruitNC’s unified profile:

1. **Year window** — If `plausibleNchsaaYearsForGradYear` maxed out too early (e.g. `gradYear + 1` only), a wrong or tight grad year on the athlete row could **exclude** the current state year (e.g. **2026**). RecruitNC now uses **`gradYear + 2`** (capped at 2032) for the high end so late-season rows stay in range.

2. **Name shape** — NCHSAA often stores **`Thompson, Ryan`**, not `Ryan Thompson`. A single `ILIKE '%Ryan Thompson%'` **does not** match `Thompson, Ryan` (no contiguous substring). Patterns that rely on one comma-separated `.or()` can also fail (same idea as Data Dawg: “patterns with commas break `.or()`”).

**Fix in this repo**

- `lib/nchsaa-profile-fetch.ts` — `fetchNchsaaResultsForAthleteProfile(supabase, athleteName)` runs **two** `ILIKE`s on `wrestler_name` (first token **and** last token), with **no year filter** on that query. That matches both **First Last** and **Last, First** spellings.
- `lib/nchsaa-results.ts` — `getNCHSAAResultsForProfile` **merges** those rows first (then exact match, variants, fallback), and applies the widened year window above.

Unified profile and `GET /api/wrestling-achievements` both use `getNCHSAAResultsForProfile` — no separate Legacy path.

**DB still wrong (SQ vs 2nd)?** If 2026 exists but placement is incorrect, fix the row in Supabase after inspecting:

```sql
SELECT * FROM wrestling_nchsaa_results
WHERE year = 2026
  AND wrestler_name ILIKE '%Thompson%'
  AND wrestler_name ILIKE '%Ryan%';
```
