# Public source imports (admin review)

Stage official public wrestling results → review diffs on **`/admin/imports`** → approve into RecruitNC. Nothing auto-publishes.

## Setup

Run in Supabase SQL Editor:

- [`scripts/public-source-imports-setup.sql`](../scripts/public-source-imports-setup.sql)

Creates `public_import_batches` + `public_import_rows` (service-role only via admin APIs).

## Datasets (v1)

| `dataset_key` | Stage from | Promotes to |
|---|---|---|
| `nchsaa_individual_placers` | NCHSAA page URL fetch, Guaranteed Places paste, or placer JSON | `wrestling_nchsaa_results` |
| `nchsaa_dual_team_champions` | Year×division JSON, DB export, or verified school leaderboard (expanded to year rows) | `dual_team_champions` |

## Annual workflow

1. After States / Duals, open `/admin/imports`.
2. Placers: **Fetch & stage** an `nchsaa.org` championship URL (or paste JSON/text).
3. Duals: paste `{ "records": [ ... ] }` (from export) or verified schools JSON.
4. Review **new** / **changed** rows; **Approve selected** only after spot-check.
5. Matches are auto-`skipped` (already identical in RecruitNC).

## Notes

- Fetch is limited to `nchsaa.org` hosts.
- HTML layouts change — treat parsers as best-effort; admin review is required.
- Athlete identity linking is separate (profiles match by name later); this pipeline writes result rows only.
- Verified duals school rollup (GPT lock): `scripts/data/nchsaa_dual_team_champions_school_leaderboard_verified_v1.json`.
