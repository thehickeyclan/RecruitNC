# NHSCA All-Americans — yearly automation

School leaderboards and school dossiers **automatically include every year registered** in [`lib/nhsca-canonical-aa.ts`](../lib/nhsca-canonical-aa.ts). Do not add year cutoffs in the query.

## Annual add (once nationals finish)

1. **Create the year’s AA roster with schools** (same shape as `/nhsca/2026`):
   - Prefer `section1_all_americans` on the year page JSON (see `lib/data/nhsca-2026-replica-page.json`), **or**
   - `lib/data/nhsca-aa/YYYY.json` (see `lib/data/nhsca-aa/YYYY.example.json`).
2. **Register the year** in `NHSCA_CANONICAL_AA_LOADERS` inside `lib/nhsca-canonical-aa.ts` (one loader entry).
3. **Deploy.** Data Dawg “most NHSCA All-Americans by school” includes that year immediately (merge at query time).
4. **Import / sync DB** (optional but recommended):
   - Admin → **NHSCA Placements** → paste/import JSON (**`high_school` required for places 1–8**), **or**
   - Click **Sync AA schools from yearly files** to fill null `high_school` from the registered roster.

## Why

`nhsca_placements` often lands without schools. The school leaderboard filters to rows with `high_school`, so without the yearly roster merge (or a sync), new years disappear from “most All-Americans by school” even though the nationals page is live.

## 2026

Already registered via `lib/data/nhsca-2026-replica-page.json`.
