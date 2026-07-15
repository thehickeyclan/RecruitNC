# NCHSAA single-season most victories

Canonical historical list of high single-season win totals from the NCHSAA document **Wrestling Most Victories (Season–All Time)** (521 rows).

## Dataset

- File: `scripts/data/nc_wrestling_most_victories_canonical_v1.json` (place the file here before import)
- Dataset key: `nc_wrestling_most_victories_single_season`
- Version: `1`
- Public leaderboard: [`/history/records/single-season-wins`](/history/records/single-season-wins)

## Schema

1. Run [`scripts/historical-record-sources-and-winningest-extend.sql`](../scripts/historical-record-sources-and-winningest-extend.sql) in the Supabase SQL Editor (creates `historical_record_sources`, extends `winningest_wrestlers`, RLS select for anon/authenticated).
2. Source truth columns remain: `wrestler_name`, `school`, `record`, `wins`, `losses`, `year`, `rank_position`, `rank_numeric`, `is_tied`.
3. Provenance / match columns: `source_id`, `source_record_id` (unique with `source_id`), `season_start_year`, `season_end_year`, `athlete_id`, `school_id`, `match_status`, `match_confidence`, `match_reasons`, `source_payload`.

`historical_record_sources` is reusable for future books (career wins, pins, team titles, etc.).

## Identity matching

Conservative only — **never** create recruiting profiles from this import.

| Status | Rule |
|--------|------|
| `matched` | Exact normalized name + confident school + compatible graduation/participation years |
| `needs_review` | Name match with school mismatch, years unknown, nicknames/abbreviations (`B.J.`, quoted nicknames), or ambiguous candidates |
| `unmatched` | No safe athlete candidate |
| `manually_confirmed` / `manually_rejected` | Admin review; preserved on re-import |

## School matching

Preserve source school strings. Match to `schools` via exact normalized key and optional `normalize_school_name` RPC. Ambiguous or missing → `school_id` null (do not merge distinct schools).

## Import

```bash
# Dry-run (validation + match preview; no writes if credentials missing — validation still runs)
npm run import:historical-wins -- --file ./scripts/data/nc_wrestling_most_victories_canonical_v1.json --dry-run

# Live upsert (requires service role). Optional: drop pre-source legacy rows.
npm run import:historical-wins -- --file ./scripts/data/nc_wrestling_most_victories_canonical_v1.json --purge-legacy
```

Confirm:

```sql
select count(*) from winningest_wrestlers w
join historical_record_sources s on s.id = w.source_id
where s.dataset_key = 'nc_wrestling_most_victories_single_season' and s.version = 1;
-- expect 521
```

## Review unmatched / needs_review

Admin: [`/admin/data-dawg/historical-matches`](/admin/data-dawg/historical-matches) — approve (with athlete pick), reject, or leave unresolved.

## Rollback

Removes **only** rows for this dataset key + version (not athletes/schools):

```bash
npm run rollback:historical-wins -- --dry-run
npm run rollback:historical-wins
```

Or SQL at the bottom of the extend script.

## Data Dawg

Tool `record_books_search` with `mode: single_season` (+ optional `min_wins`, `season`, `school`, `query`) reads `winningest_wrestlers` and includes a `context` blurb per row.

## Adding future historical datasets

1. Add a row in `historical_record_sources` (`dataset_key` + `version`).
2. Prefer extending an existing category table (like `winningest_wrestlers`) or a new table with the same provenance columns.
3. Add an import script following `scripts/import-historical-single-season-wins.ts`.
4. Wire Data Dawg tools / a small public page as needed.
