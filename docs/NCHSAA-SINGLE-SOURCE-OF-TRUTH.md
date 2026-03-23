# NCHSAA state data: single source of truth

**Do not reimplement NCHSAA matching.** All surfaces that show state (NCHSAA) results must use the same code path. Same table, same filters, same function.

## Source of truth

- **Table:** `wrestling_nchsaa_results`
- **Function:** `getNCHSAAResultsForProfile(supabase, athleteName)` in **`lib/nchsaa-results.ts`**
  - Uses name variations (First Last / Last, First), `ilike` per variation, merge + placer-over-SQ dedupe.
  - No year filter — returns all years for that name.

## Call sites (must stay aligned)

| Surface | How it gets NCHSAA |
|--------|---------------------|
| **Unified public profile** | `/api/wrestling-achievements?name=...&wrestling_name=...` → `getNCHSAAResultsForProfile` for each, then `mergeNchsaaResults` |
| **Prospect Rankings Manager** | `/api/admin/prospects/simple-ranking` GET → `getNCHSAAResultsForProfile` per athlete (name + wrestling_name), then `mergeNchsaaResults` |
| **Ranking API (admin)** | `/api/admin/prospects/ranking` GET → same as above |

If you add a new page or API that displays state results, call `getNCHSAAResultsForProfile` (and optionally `mergeNchsaaResults` for name + wrestling_name). Do not write a new query or new name-matching logic.

## Debugging

- **Prospect Rankings Manager:** Turn on **Debug NCHSAA** in the filters, then reload. The yellow debug panel shows:
  - `source` — confirms which function/table
  - `total_athletes` / `athletes_with_nchsaa`
  - `per_athlete` — for each athlete: names queried, counts by name vs wrestling_name, merged count, years returned
- **APIs:** Add `?debug=1` to the request URL. Response includes `_debug` (and each prospect/athlete may include `_debug` with the same per-row info).
- **Name / missing results:** Use **`GET /api/nchsaa-lookup?name=First+Last`** (optional `&year=2026`). Same as legacy `/api/debug/nchsaa-lookup`. Returns profile-style result for that name plus raw NCHSAA rows containing the last name. If profile-style is empty but raw rows exist, the DB likely has a different spelling (e.g. "Maxwell Davis"); set the athlete’s **wrestling_name** to that exact spelling so the profile and rankings can match.

Use this to verify that the names we query and the years/counts returned match what you expect (e.g. compare to the unified profile for the same athlete).

## Why one function

State data does not change per context: same table, same rows. Multiple implementations led to subtle differences (year filters, name matching, ilike vs in-memory) and hours of “why does the profile show 4 years but the ranking shows 2?” Using one function everywhere fixes that and keeps future changes in one place.
