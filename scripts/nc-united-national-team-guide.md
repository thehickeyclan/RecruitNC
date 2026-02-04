# NC United National Team – Data Guide

## Overview

The **NC United National Team** section on unified profiles shows:
- **Ultimate Club Duals** (team dual meet)
- **NHSCA National Duals** (team dual meet – NOT individual NHSCA Nationals)

Individual NHSCA Nationals results appear in the separate "NHSCA National Championship" section.

## Canonical data (Supabase)

| Table | Purpose |
|------|--------|
| `nc_united_tournaments` | One row per event (name, year, location, team_record, overall_placement, etc.) |
| `nc_united_wrestlers` | Wrestlers (first_name, last_name, weight, high_school) |
| `nc_united_tournament_results` | Per-wrestler, per-tournament (weight, record, wins, losses, points, category, image_path) |
| `nc_united_matches` | Individual match rows linked to a tournament result |
| `nc_united_dual_results` | Dual meet results (opponent_team, our_score, opponent_score, result) |
| `nc_united_images` | Gallery images (tournament/wrestler, path, alt_text, caption) |

- **Schema:** `scripts/155-create-nc-united-national-team-schema.sql`
- **Data load scripts:**  
  - NHSCA Duals 2025: `scripts/156-insert-nhsca-2025-data.sql`  
  - Ultimate Club Duals 2024: `scripts/157-insert-ucd-2024-data.sql`  
  - Ultimate Club Duals 2025: `scripts/158-insert-ucd-2025-data.sql`  
  Each script upserts the tournament row, inserts/updates wrestlers, and inserts into `nc_united_tournament_results` (and `nc_united_matches` / `nc_united_dual_results` where used).

## How the app reads it

- **Unified profile:** `app/unified-profile/[id]/page.tsx` uses `createAdminClient()` and calls `getUltimateClubDualsFromTables(supabase, athleteName, highSchool)` in `lib/tournament-tables.ts`, which queries `nc_united_tournament_results` with embedded `nc_united_wrestlers` and `nc_united_tournaments`. Results are merged with athlete-row fallback and passed to `TournamentResultsDisplay`.
- **Athlete row fallback:** If nc_united has no row for that athlete, the section can still show data from the athlete record: `ultimate_club_duals_*`, `nhsca_national_duals_*` (see below).

## Data sources (priority order)

1. **nc_united tables** – `nc_united_tournament_results` + `nc_united_wrestlers` + `nc_united_tournaments` (canonical for NHSCA Duals 2025, UCD 2024, UCD 2025).
2. **Athlete row fallback** – `ultimate_club_duals_*`, `nhsca_national_duals_*` when nc_united has no row for that athlete.

## Add columns (run once)

```sql
-- In Supabase SQL Editor
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ultimate_club_duals_2025_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ultimate_club_duals_2024_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ultimate_club_duals_2023_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS nhsca_national_duals_2025_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS nhsca_national_duals_2024_record TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS nhsca_national_duals_2023_record TEXT;
```

Or call: `GET /api/run-script/add-national-team-columns`

## Populate Luke Richards (or others) when nc_united lacks data

```sql
-- Example: Luke Richards – NHSCA National Duals 2025
UPDATE athletes 
SET nhsca_national_duals_2025_record = '4-4'   -- adjust record
WHERE name ILIKE '%Luke Richards%' 
  AND highschool ILIKE '%Cardinal Gibbons%';
```

## Tournament names in nc_united_tournaments

- **Ultimate Club Duals** – name contains "ultimate club duals"
- **NHSCA National Duals** – name contains "nhsca" and ("national duals" or "duals")

Results from nc_united tables are matched by athlete name + high school.
