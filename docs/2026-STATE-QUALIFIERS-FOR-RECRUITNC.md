# 2026 NCHSAA — placements & state qualifiers (RecruitNC)

**Canonical document (full detail, SQL, Blue stats):** [`docs/2026-state-qualifier-data.md`](./2026-state-qualifier-data.md)

This filename is a **stable alias** for links and search; content is maintained in `2026-state-qualifier-data.md`.

---

## Single source of truth

NCHSAA **placements and state qualifiers (SQ)** for **all years**, including **2026**, live in **one** Supabase table:

### `wrestling_nchsaa_results`

Same project database as **LegacyNC** and **RecruitNC**. There is **no** separate “2026 only” table — use `WHERE year = 2026` (and other filters as needed).

| Column | Role |
|--------|------|
| `year` | e.g. `2026` |
| `place` | `0` = state qualifier (SQ). **2026:** `1`–`4` = placers (top 4 per weight). Older years may use placers `1`–`8`. |
| `classification` | e.g. `7A`, `4A`, `1A/2A` |
| `weight_class` | e.g. `165` |
| `wrestler_name` | Full name; **often** `"Last, First"` |
| `school` | High school name |

**Ingestion:** Admin uploads and SQL seeds in this repo (e.g. women’s 2026 batch: `scripts/supabase-insert-womens-2026-state-results.sql`; other placers/SQ pipelines) **insert or update** rows in **`wrestling_nchsaa_results`**.

**Bulk 2026 placers from official JSON:** Save the tournament export as `scripts/nchsaa-2026-state-placers.json` (see shape in `scripts/nchsaa-2026-state-placers.example.json`), then run `node scripts/import-nchsaa-2026-placers-from-json.js` to generate `scripts/generated-nchsaa-2026-placers-insert.sql`. Review the file, optionally uncomment the `DELETE … WHERE year = 2026 AND place BETWEEN 1 AND 4` block to replace all placers, then run the script in the Supabase SQL Editor.

**Profiles:** RecruitNC reads state lines via `lib/nchsaa-results.ts` → `getNCHSAAResultsForProfile` (and `GET /api/wrestling-achievements`). Optional merge from `athletes.nchsaa_results` JSON is **only** a fallback when the table query fails or to fill gaps — **canonical data is the table above.**
