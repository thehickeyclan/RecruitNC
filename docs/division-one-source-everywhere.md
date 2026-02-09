# Division: one source everywhere (RecruitNC + legacy NC)

**Rule:** Anywhere in the app we show or use a college’s division, we use **one source only**: `college_division_mappings`, via `getDivisionFromMappings(collegeName)` (or the API that uses it).

Do **not** use for display or logic:

- `athlete.division`
- `college_master.division`
- `logo_mappings.division`
- Any other table or column

**Single source:** `college_division_mappings` (columns: `college_name`, `division`).  
**Single entry point in code:** `getDivisionFromMappings(collegeName)` in `lib/get-division-from-mappings.ts`.

## Where this applies

- Blue alumni table
- Commitment cards, flip cards, athlete cards
- College tab, any “college” or “commit” view
- Stats by division (when deriving division from a college name)
- Filters by division
- Any RecruitNC or legacy NC screen that mentions a college’s division

## Pattern

- When you have a **college name** (e.g. from `athlete.college`): call `getDivisionFromMappings(collegeName)` (server) or `GET /api/get-college-division?college=...` (client). Use that result for display; use `getDivisionDisplayShort(division)` or `getDivisionDisplayFull(division)` for labels (DI, DII, DIII or NCAA Division I, etc.).
- When you **load athlete/recruit data** for display: resolve division from the athlete’s college (e.g. in the API or server component) with `getDivisionFromMappings(athlete.college)` and attach it to the payload (e.g. as `division` or `displayDivision`). Then the UI just displays that value; no second source.

## Missing colleges (table incomplete)

The table will often be missing many colleges. **Do not introduce new issues:** when a college is not in `college_division_mappings`, we **fall back** to the athlete’s stored `division` so we don’t show "Unknown" everywhere.

- **`getDivisionFromMappings(collegeName)`** returns `""` when the college is not in the table (not `"Unknown"`). Callers must use: `(await getDivisionFromMappings(college)) || athlete.division || "Unknown"` (or equivalent) so display always has a sensible value.
- **Blue alumni:** uses mapping first, then `athlete.division`, then `"Unknown"`.
- **Client components:** `useResolvedDivision(athlete.college)` returns `""` when not in table; components use `displayDivision || athlete.division` so the stored value is shown until the table is filled.

## How to add a new college to the table

When you **edit an athlete** (Admin → Athletes → Edit) and set **College** and **Division**, the division field is a **dropdown** that only allows canonical values (NCAA Division I, NCAA Division II, NCAA Division III, NAIA, NJCAA, Club (NCWA)). That prevents inconsistent free-text. On save we **upsert** that college into `college_division_mappings`, so **you add a new college by updating the athlete’s college + division and saving**. No need to touch Supabase manually for that college again.

You can still add rows manually in Supabase (Table Editor → college_division_mappings), or use Admin → College division mappings to see **missing** colleges and add them in bulk.

## Aligned filtering (athletes, schools, pages)

All division **filtering** uses the same rules so filters behave consistently and legacy DB values (e.g. "D1", "Division I") still match:

- **Filter options:** Use the canonical list `CANONICAL_DIVISIONS_FULL` (NCAA Division I, NCAA Division II, etc.) for dropdowns. Do not build options from raw `athlete.division` only, or you get mixed labels.
- **Compare when filtering:** Use `matchesDivisionFilter(athlete.division, filterValue)` so "D1", "DI", "NCAA Division I" all match the "NCAA Division I" filter. Filter value should be `"all"` or a canonical full division.
- **API (e.g. GET /api/athletes?division=...):** Use `getDivisionFilterValues(divisionFilter)` and `.in("division", values)` so the DB query matches both canonical and legacy division strings.
