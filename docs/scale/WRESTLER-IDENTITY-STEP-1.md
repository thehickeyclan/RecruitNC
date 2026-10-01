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

## Matching rules (`LINK_MATCHER_VERSION = 2026-10-01.3`)

Built on the read path's own rules (`lib/athlete-name-match.ts`), so a stored link agrees with what
the profile already shows.

| Outcome | When |
|---|---|
| **linked** | Exactly one profile fits the name, nothing contradicts it, and the record corroborates it: same school, or a grade division / recorded class year that pins the graduation year. |
| **linked (no school listed)** | One profile has the name, the source lists no school, and the class year fits. Matt's call, 1 October: these already show on profiles through name matching, so storing them changes nothing visible. |
| **review** | The name fits but nothing corroborates it; two profiles fit; or an existing stored link disagrees with the record. A person decides. |
| **no_match / namesake_rejected** | The division, class year, state, or every comparable signal points to someone else. Not stored. |
| **no_match / no_profile** | The wrestler has no profile. Not stored. |

Name plus a plausible year is never enough on its own — that is how namesakes got in.

## First dry run (1 October 2026)

| Table | Rows | Linked | of which already linked | Review | Namesakes rejected |
|---|---|---|---|---|---|
| wrestling_nchsaa_results | 10,785 | 699 | 648 | 16 | 3 |
| nhsca_placements | 1,497 | 399 | 341 | 0 | 0 |
| wrestling_nhsca_results | 356 | 59 | — | 0 | 2 |
| super32_results | 835 | 157 | — | 43 | 1 |
| fargo_results | 191 | 101 | 97 | 9 | 0 |
| other_tournament_results | 655 | 251 | 251 | 26 | 0 |
| national_rankings | 720 | 3 | 2 | 0 | 0 |

Everything else is wrestlers with no profile, as expected — results tables cover every wrestler, the
site has 512 profiles.

**8 links stored today are wrong**: old NCHSAA results attached to a current wrestler of the same
name, e.g. Jonathan Burns' 2005–08 results for Cary and Cardinal Gibbons linked to the 2027 Jonathan
Burns at Franklinton. The profile's own namesake filter already hides them, so nothing wrong is shown;
they sit in review rather than being changed automatically.

Written 1 October: 1,669 links and 94 review rows (`result_athlete_links`).

**Rule learned on the first run:** NHSCA lets a wrestler enter an older grade's bracket, never a
younger one. Version .1 treated any division mismatch as a different person and flagged seven correct
links (Jacob Campos, a junior, in the Senior bracket). Version .2 rejects only a division younger than
the wrestler.

## Review screen

`/admin/identity-review` (Result review in the admin bar): the result beside each candidate profile — Same wrestler, Not him, or Skip. Decisions are final; the backfill never rewrites a row with `reviewed_at` set. After version .3: **36 rows** (26 school differs, 8 wrong stored links, 2 with two profiles).

## Keeping links current (1 October 2026)

`lib/identity/link-results.ts` is the one routine that decides and stores links:

- **Importers** call it right after inserting (public-import approval for NCHSAA and Fargo, both
  NHSCA admin importers), so new results show immediately.
- **Hourly cron** `/api/cron/link-results` (`:20` past each hour) covers rows created or changed in
  the last three hours and the results of profiles created or changed in that window - script and
  SQL imports, and a profile made after its results were loaded.
- **Backfill script** runs it over everything.

NHSCA admin importers delete and re-insert a year, so a hand decision on a re-imported NHSCA row
comes back to review.

## Next steps

2. Review the 101 rows (admin screen), then the site reads stored links first and falls back to name
   matching where there is none.
3. Side-by-side check for all athletes — tournament results, significant wins, star ratings, report
   facts — before switching.
4. Importers write links at import time.
5. Retire per-view name lookups.
