# Fargo Nationals connector (canonical SoR)

RecruitNC’s **source of truth** for Fargo Nationals results used by athlete profiles, Data Dawg, `/fargo` pages, NC history, school/club rollups, and historical rankings.

**Never** use FloWrestling as the canonical source. Flo may only assist validation after official adapters exist.

Admin hub: **`/admin/imports`** → stage → review → approve. Nothing auto-publishes.

---

## Design principles

1. **Freestyle and Greco-Roman are separate competitions and separate careers**, plus a **combined** Fargo career for analysis.
2. An athlete may wrestle Junior FS, Junior GR, 16U FS, and 16U GR in the same year — **never merge** those rows.
3. **Boys and Girls** brackets are independent (`gender` M/F).
4. Reuse the public-imports framework (`public_import_batches` / `public_import_rows`) and existing identity matchers — do not create duplicate athletes on name alone.
5. Verified rows (`verification_status = verified`) are never overwritten silently (diff → `conflict`; promote refuses).

---

## Phases

### Phase 1 (shipped in code) — season aggregates

| Piece | Location |
|-------|----------|
| Dataset key | `fargo_nationals_results` |
| Connector registry | `lib/public-imports/connectors/fargo-nationals.ts` |
| Runner | `lib/public-imports/run-fargo-nationals.ts` |
| Parser | `lib/public-imports/parse-fargo.ts` (CSV + JSON) |
| Schema harden | `scripts/fargo-results-harden-setup.sql` |
| Career helpers (FS / GR / combined) | `lib/fargo-career.ts` |
| Admin | `/admin/imports` → **Stage Fargo Nationals** |

Canonical season table: **`fargo_results`**, natural key:

`year | style | age_division | gender | weight_class | lower(athlete_name)`

`style`: `FS` | `GR`  
`age_division`: `16U` | `Junior`  
`gender`: `M` | `F`

Current CSV snapshots live under `scripts/data/fargo/` (historical NC extracts). Register new years in the connector after Fargo each July.

### Phase 2 (shipped) — bout-level SoR + full adapters

| Piece | Location |
|-------|----------|
| Full connector | `/admin/imports` → **Run full Fargo connector** |
| API | `POST /api/admin/imports/connectors/fargo-full` |
| Event registry | `lib/public-imports/connectors/fargo-events.ts` |
| USA Bracketing adapter | `lib/public-imports/adapters/fargo-usa-bracketing.ts` |
| Trackwrestling adapter | `lib/public-imports/adapters/fargo-trackwrestling.ts` |
| Materialize | `lib/public-imports/adapters/fargo-materialize.ts` |
| Validation report | `lib/public-imports/adapters/fargo-validate.ts` |
| Bout dataset | `fargo_nationals_bouts` → `fargo_bouts` |
| Exports dir | `scripts/data/fargo/exports/` |
| Bout SQL | `scripts/fargo-bouts-full-setup.sql` |
| Leaderboards | `lib/fargo-leaderboards.ts` (FS / GR / combined) |

Live fetch scaffolding allowlists `usawrestlingevents.com`, `usabracketing.com`, `trackwrestling.com`, `themat.com`. USA Bracketing login walls fall back to **local official exports** (required until public JSON endpoints stabilize).

### Phase 3 — remaining product surfaces

- Stronger athlete linking (grad year, school, club, aliases — no name-only merge)
- Richer `/fargo/[year]/…` bracket pages wired to `fargo_bouts`
- School / club derived totals UI

---

## Annual operator workflow (Phase 1)

1. Run once in Supabase (if not yet):
   - `scripts/public-source-imports-setup.sql`
   - `scripts/create-fargo-results-table.sql` (if table missing)
   - **`scripts/fargo-results-harden-setup.sql`**
2. After Fargo, add/update CSVs in `scripts/data/fargo/` (official USA Wrestling / USA Bracketing exports — not Flo).
3. Register the year in `lib/public-imports/connectors/fargo-nationals.ts`.
4. Deploy → `/admin/imports` → set year → **Stage Fargo Nationals** → spot-check → **Approve selected**.
5. Optional: paste Fargo CSV/JSON with dataset **Fargo Nationals**.

Legacy CLI (bypasses review — prefer admin connector):

```bash
node scripts/import-fargo-results.mjs scripts/data/fargo/*.csv
```

---

## Data Dawg

Existing tools already read `fargo_results` (dossier, cross-store, `fargo_results_by_year`).

Career math for style-split answers: `summarizeFargoCareer` / `formatFargoCareerAnswerLines` in `lib/fargo-career.ts`.

Intended questions (Phase 3 wiring):

- How many Fargo All-Americans does X have? (combined / FS / GR)
- Who has the most Greco All-Americans in NC history?
- Combined Fargo career record for X

---

## Anti-patterns

- Importing Flo brackets as SoR
- Merging Freestyle + Greco into one row
- Yearly CLI wipes without admin review when the connector exists
- Name-only athlete merges
- Claiming USA Bracketing / Track live adapters are done before Phase 2 lands
