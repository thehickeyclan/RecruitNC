# Public source imports (admin review)

Stage official public wrestling results → review diffs on **`/admin/imports`** → approve into RecruitNC. Nothing auto-publishes.

## Setup

Run in Supabase SQL Editor:

- [`scripts/public-source-imports-setup.sql`](../scripts/public-source-imports-setup.sql)

Creates `public_import_batches` + `public_import_rows` (service-role only via admin APIs).

## Annual reminders (do not remove from product)

Keep the checklist visible on **`/admin/imports`** (“Annual reminders (connectors)”). Agent rule: `.cursor/rules/public-source-connectors.mdc`.

| When | What |
|------|------|
| February | Add NCHSAA Individual States URLs → connector → approve |
| After Duals | Add dual-team URL → **Fetch & stage Dual Team** → approve |
| After NHSCA nationals | Register AA year + schools → sync/import |
| Summer / realignment | Add season year for `/schools/` → **Fetch & stage Classifications** → approve |
| After Fargo (July) | Update `scripts/data/fargo/` CSVs → register year → **Stage Fargo Nationals** → approve (`docs/FARGO-NATIONALS-CONNECTOR.md`) |

## Datasets (v1)


| `dataset_key` | Stage from | Promotes to |
|---|---|---|
| `nchsaa_individual_placers` | **Priority 1 connector**, page URL fetch, Guaranteed Places / Championship Finals paste, or placer JSON | `wrestling_nchsaa_results` |
| `nchsaa_dual_team_champions` | **Dual Team connector**, year×division JSON, DB export, dual page text, or verified school leaderboard (expanded to year rows) | `dual_team_champions` |
| `nchsaa_school_classifications` | **Classifications connector** (`nchsaa.org/schools/`), JSON, or schools HTML/table paste | `school_classifications` + `school_classification_years` |
| `fargo_nationals_results` | **Full Fargo connector** + CSV connector / season JSON | `fargo_results` (FS/GR separate careers) |
| `fargo_nationals_bouts` | **Full Fargo connector** (USA Bracketing / Track exports) | `fargo_bouts` |

## Priority 1 — NCHSAA Individual States connector

On `/admin/imports`:

1. Set year (e.g. `2026`)
2. Click **Fetch & stage Individual States**
3. Review new/changed → **Approve selected**

Sources registered in `lib/public-imports/connectors/nchsaa-individual-states.ts` (add URLs each February).

Parses:

- **Guaranteed Places** (1st–6th) when NCHSAA publishes them
- **Championship Finals** (champ + runner-up) on newer classification pages (e.g. 2026 men/women)

API: `POST /api/admin/imports/connectors/nchsaa-individual-states` `{ "year": 2026 }`

## Dual Team Championships connector

On `/admin/imports`:

1. Set year (e.g. `2026`)
2. Click **Fetch & stage Dual Team**
3. Review new/changed → **Approve selected**

Sources registered in `lib/public-imports/connectors/nchsaa-dual-team.ts`.

Parses:

- **2026-style** structured pages (`State Champion:` + championship match scores; 1A–8A)
- **2024/2025-style** article pages (headlines + defeated/win-against prose)

Canonical rows are **year × division**. School “most titles” leaderboards are derived — do not promote aggregates alone.

API: `POST /api/admin/imports/connectors/nchsaa-dual-team` `{ "year": 2026 }`


## School Classifications connector

On `/admin/imports`:

1. Run `scripts/school-classification-years-setup.sql` once in Supabase (year history table)
2. Set year (e.g. `2026` for 2025-26 membership)
3. Click **Fetch & stage Classifications**
4. Review new/changed → **Approve selected**

Sources: `lib/public-imports/connectors/nchsaa-classifications.ts` (official `/schools/` directory).

Promotes:

- `school_classification_years` — year-scoped membership (reclass history)
- `school_classifications` — current snapshot used by rankings / Data Dawg / forms

API: `POST /api/admin/imports/connectors/nchsaa-classifications` `{ "year": 2026 }`

## Fargo Nationals connector (canonical SoR)

Full roadmap: [`docs/FARGO-NATIONALS-CONNECTOR.md`](./FARGO-NATIONALS-CONNECTOR.md).

### Full connector (preferred)

On `/admin/imports`:

1. Run in Supabase: `scripts/fargo-results-harden-setup.sql` then `scripts/fargo-bouts-full-setup.sql`
2. Drop USA Bracketing / Trackwrestling exports into `scripts/data/fargo/exports/` (paths registered in `lib/public-imports/connectors/fargo-events.ts`)
3. Set year → **Run full Fargo connector**
4. Review season + bout batches → **Approve selected**

Adapters: USA Bracketing (current) + Trackwrestling (historical). Validation report includes NC AA/champs, FS vs GR, conflicts. Flo never SoR.

API: `POST /api/admin/imports/connectors/fargo-full` `{ "year": 2026 }`

### CSV season fallback

**Stage Fargo CSV seasons** still loads `scripts/data/fargo/*.csv` via `fargo-nationals` connector.

API: `POST /api/admin/imports/connectors/fargo-nationals` `{ "year": 2026 }`

## Annual workflow (manual review still required)

1. After States / Duals, open `/admin/imports`.
2. Placers: **Fetch & stage Individual States** (or paste JSON/text).
3. Duals: **Fetch & stage Dual Team** (or paste `{ "records": [ ... ] }` / dual page text).
4. Review **new** / **changed** rows; **Approve selected** only after spot-check.
5. Matches are auto-`skipped` (already identical in RecruitNC).

## Notes

- NCHSAA fetch is limited to `nchsaa.org`. Fargo full connector also allowlists `usawrestlingevents.com`, `usabracketing.com`, `trackwrestling.com`, `themat.com` (never Flo).
- HTML layouts change — treat parsers as best-effort; admin review is required.
- Athlete identity linking is separate (profiles match by name later); this pipeline writes result rows only.
- Verified duals school rollup (GPT lock): `scripts/data/nchsaa_dual_team_champions_school_leaderboard_verified_v1.json`.
