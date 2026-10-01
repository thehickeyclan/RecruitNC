# Wrestler identity, step 1: store which profile each result belongs to

## Why

Every profile, scouting report, ranking and star rating finds a wrestler's results by name, across
six tables, on every view. In the week from 24 September 2026 that was about 1.5 million name lookups
for 512 athletes — roughly 70% of database time. At national scale it grows with athletes × page
views, and names collide across states. Step 1 records the answer once.

## What step 1 does — and does not — change

- **Adds one table, `result_athlete_links`.** No existing table or column is altered.
- **Nothing on the site reads it yet.** Pages behave exactly as before.
- **Fills it with a backfill script** (`scripts/identity/backfill-result-links.ts`), dry run by
  default, using the matcher in `lib/identity/result-athlete-link.ts`.

## Matching rules (`LINK_MATCHER_VERSION = 2026-10-01.1`)

Built on the read path's own rules (`lib/athlete-name-match.ts`), so a stored link agrees with what
the profile already shows.

| Outcome | When |
|---|---|
| **linked** | Exactly one profile fits the name, nothing contradicts it, and the record corroborates it: same school, or a grade division / recorded class year that pins the graduation year. |
| **review** | The name fits but nothing corroborates it; two profiles fit; or an existing stored link disagrees with the record. A person decides. |
| **no_match / namesake_rejected** | The division, class year, state, or every comparable signal points to someone else. Not stored. |
| **no_match / no_profile** | The wrestler has no profile. Not stored. |

Name plus a plausible year is never enough on its own — that is how namesakes got in.

## First dry run (1 October 2026)

| Table | Rows | Linked | of which already linked | Review | Namesakes rejected |
|---|---|---|---|---|---|
| wrestling_nchsaa_results | 10,785 | 699 | 648 | 16 | 3 |
| nhsca_placements | 1,497 | 392 | 334 | 7 | 0 |
| wrestling_nhsca_results | 356 | 59 | — | 0 | 2 |
| super32_results | 835 | 157 | — | 43 | 1 |
| fargo_results | 191 | 101 | 97 | 9 | 0 |
| other_tournament_results | 655 | 251 | 251 | 26 | 0 |
| national_rankings | 720 | 3 | 2 | 0 | 0 |

Everything else is wrestlers with no profile, as expected — results tables cover every wrestler, the
site has 512 profiles.

**15 links stored today are wrong** (an existing `athlete_id` the record contradicts), e.g. Jonathan
Burns' 2007–08 NCHSAA results for Cardinal Gibbons linked to the 2027 Jonathan Burns at Franklinton.
They go to review rather than being changed automatically.

## Next steps

2. Review the 101 rows (admin screen), then the site reads stored links first and falls back to name
   matching where there is none.
3. Side-by-side check for all athletes — tournament results, significant wins, star ratings, report
   facts — before switching.
4. Importers write links at import time.
5. Retire per-view name lookups.
