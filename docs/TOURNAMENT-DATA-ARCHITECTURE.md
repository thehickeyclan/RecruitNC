# Tournament Data Architecture (NHSCA & Super32)

**Source of truth: database tables. Do NOT copy data into athlete rows.**

## Data Flow

| Data      | Primary Table           | Fallback Table             | Fallback 2     |
|-----------|-------------------------|----------------------------|----------------|
| NHSCA     | `nhsca_placements`      | `wrestling_nhsca_results`  | athlete row    |
| Super32   | `super32_results`       | —                          | none (table only) |
| Ultimate Club Duals | `nc_united_tournament_results` (via nc_united_wrestlers, nc_united_tournaments) | athlete row (ultimate_club_duals_2024_record, ultimate_club_duals_2025_record) | — |

Unified profile: NHSCA falls back to athlete row when tables return no rows. **Super32 does not use athlete-row fallback** (table only) to avoid wrong/duplicate data; results are deduped by year and filtered by high_school when provided.

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
- **NHSCA + NCHSAA:** For NC bulk imports, use **Expand names from NCHSAA** (admin API) so bracket initials become state spellings when uniquely resolvable — see `docs/NHSCA-NCHSAA-UNIFIED-ARCHITECTURE.md`.
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

---

## Data Dawg vs unified profile (why Super32 can differ)

**Data Dawg** (LegacyNC) gets Super32 from:

1. **Main LegacyNC Supabase** — `super32_results` table (same as RecruitNC when they share that DB).
2. **Optional separate Super32 Supabase** — If LegacyNC has `SUPER32_SUPABASE_URL` and `SUPER32_SUPABASE_SERVICE_ROLE_KEY` set, it can query a dedicated Super32 project via `getSuper32Admin()`. It may use “local” `super32_results` first and fall back to that project.

**RecruitNC unified profile** always reads Super32 from the **main Supabase** (the one RecruitNC uses) via `getSuper32FromTable()` → `super32_results`.

So if Data Dawg shows correct Super32 and the unified profile shows wrong (e.g. Adair Panama, Aidan Gore):

- LegacyNC may be using the **separate Super32 Supabase**, which has clean data; RecruitNC only sees the main DB’s `super32_results`, which still has bad rows.
- Or both use the main DB but the main DB has wrong rows — fix by running **Admin → Super32 Tools → Nuclear Reconcile** for 2022, 2023, 2024 so the main DB matches the verified CSVs.

To align RecruitNC with Data Dawg: either clean the main DB (nuclear reconcile / delete wrong rows) or, if you want RecruitNC to use the same source as Data Dawg when the separate Super32 project is configured, add the same optional Super32 Supabase client and use it in `getSuper32FromTable()` (or a separate path) when those env vars are set.
