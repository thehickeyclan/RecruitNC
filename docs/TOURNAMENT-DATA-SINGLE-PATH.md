# One Path for Tournament Data (NCHSAA, NHSCA, Super32)

**Why new pages take so long:** The same data (NCHSAA, NHSCA, Super32) is used in profiles, rankings, commit cards, athlete admin, and Blue—but each place was wired differently. Some call `getNHSCAFromTables` + `getSuper32FromTable` directly; some use NCHSAA from `nchsaa-results` only. So every new page meant rediscovering which functions to call, which options to pass, and how to aggregate. The data never moved; the **entry point** was inconsistent.

**Rule for any new page that needs this data:** Use the **single loader** and don’t call the low-level fetchers from the new feature.

---

## Single entry point

| What you need | Where | What to call |
|---------------|--------|---------------|
| NCHSAA + NHSCA + Super32 for one athlete | `lib/profile-tournament-data.ts` | `loadProfileTournamentData(supabase, athlete, options?)` |

- **Options:** `{ allTime: true }` → NHSCA and Super32 over all years (e.g. Blue “all-time” tiles). Omit for grad-year window (profiles, rankings).
- **Returns:** `{ nchsaa, nhsca, super32 }` — same shapes as the underlying tables (see `lib/nchsaa-results.ts`, `lib/tournament-tables.ts`).

NCHSAA always returns all years (no year filter in the fetcher). NHSCA/Super32 are either grad-year window or all-time depending on `allTime`.

---

## How to add a new page (3 steps)

1. **Get your athlete list** the same way you do elsewhere (e.g. Blue = `blue_memberships` + `ncUnitedTeam`; rankings = by grad year/gender; etc.).
2. **For each athlete, call the loader:**
   ```ts
   const data = await loadProfileTournamentData(supabase, athlete, { allTime: true }) // or {} for windowed
   ```
   Use admin client if the route is admin-only (e.g. `createAdminClient()`).
3. **Build your UI** from `data.nchsaa`, `data.nhsca`, `data.super32`. No need to call `getNCHSAAResultsForProfile`, `getNHSCAFromTables`, or `getSuper32FromTable` in the new route.

**Reference implementation:** `app/api/admin/blue/members-2026/route.ts` — same data, same loader, only the filter (Blue members) and the stats/rows you derive from the result are different.

---

## Where the raw data lives (for reference only)

- **NCHSAA:** `lib/nchsaa-results.ts` → `getNCHSAAResultsForProfile()` → table `wrestling_nchsaa_results`
- **NHSCA:** `lib/tournament-tables.ts` → `getNHSCAFromTables()` / `getNHSCAFromTablesAllTime()` → `nhsca_placements`, `wrestling_nhsca_results`
- **Super32:** `lib/tournament-tables.ts` → `getSuper32FromTable()` / `getSuper32FromTableAllTime()` → `super32_results`

Existing routes (rankings, athlete admin, college guide, etc.) still call these directly. **New pages should use `loadProfileTournamentData`** so one place defines “how we load tournament data” and new features only define “which athletes” and “how to display.”
