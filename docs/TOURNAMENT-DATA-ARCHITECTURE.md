# Tournament Data Architecture (NHSCA & Super32)

**Source of truth: database tables. Do NOT copy data into athlete rows.**

## Data Flow

| Data      | Primary Table           | Fallback Table             | Fallback 2     |
|-----------|-------------------------|----------------------------|----------------|
| NHSCA     | `nhsca_placements`      | `wrestling_nhsca_results`  | athlete row    |
| Super32   | `super32_results`       | —                          | athlete row    |

All profile pages, rankings APIs, and coach portal read from these tables. Athlete row columns (`nhsca_2025_record`, `super_32_2025_record`, etc.) are used only when the tables return no rows.

## Table Schemas

### nhsca_placements
- `athlete_name`, `year`, `placement`, `record`, `weight_class`, `division`, `high_school`

### wrestling_nhsca_results
- `athlete_name`, `year`, `placement` or `place`, `record` or `record_text`, `weight`, `division`

### super32_results
- `athlete_name`, `year`, `record`, `wins`, `losses`, `weight_class`, `high_school`, `school`

## Code

- **Fetchers:** `lib/tournament-tables.ts` — `getNHSCAFromTables()`, `getSuper32FromTable()`
- **Used by:**
  - `app/unified-profile/[id]/page.tsx`
  - `app/api/public-rankings/route.ts`
  - `app/api/coaches/athlete-details/[id]/route.ts`

## Matching Rules

- **NHSCA:** Match by `athlete_name` (ilike) + year range (graduation year ± 4).
- **Super32:** Match by `athlete_name` (ilike) + year range. If multiple athletes share a name (e.g. Connor Reece vs Connor Reese), filter by `high_school` against `athlete.highschool`. School comparison is bidirectional (either string contains the other).

## Adding New Athletes

1. Add athlete to `athletes` table.
2. Add NHSCA rows to `nhsca_placements` or `wrestling_nhsca_results`.
3. Add Super32 rows to `super32_results`.
4. Data appears on profiles automatically. **No manual UPDATEs to athlete rows.**

## Do NOT

- Manually UPDATE `super_32_2025_record`, `nhsca_2025_placement`, etc. on athlete rows for display.
- Create `wrestling_super32_results` — use `super32_results`.
- Query athlete row scalar columns as the primary source for tournament data.
