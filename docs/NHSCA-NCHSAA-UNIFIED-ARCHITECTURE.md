# NHSCA and NCHSAA: same architectural idea

## Principle

Both should be **table-first**:

- **NCHSAA:** `wrestling_nchsaa_results` — profiles resolve by **name** (and variations) at read time (`getNCHSAAResultsForProfile` in `lib/nchsaa-results.ts`).
- **NHSCA:** `nhsca_placements` and/or `wrestling_nhsca_results` — profiles resolve via **`getNHSCAFromTables`** in `lib/tournament-tables.ts` (name + graduation window), with athlete JSON as a merge/fallback where needed.

The awkward part was **bulk NHSCA imports** using bracket abbreviations (**"T. Hall"**) while RecruitNC profiles use full names. That is a **data normalization** problem, not a different product model.

## NCHSAA-assisted name expansion

Most NC kids who appear in an NHSCA seniors file also have a **state** row the same year, same weight, same school (when known). We can copy the **canonical `wrestler_name`** from `wrestling_nchsaa_results` into `nhsca_placements.athlete_name` when the match is **unique**.

Implementation:

- `lib/nhsca-resolve-name-from-nchsaa.ts` — `resolveCanonicalNameFromNchsaa`
- Admin: **POST `/api/admin/nhsca-placements/resolve-names-from-nchsaa`** body `{ "year": 2026 }`
- UI: **Expand names from NCHSAA** on `/admin/nhsca-placements` (run after **Import**, before **Auto-Match**)

After expansion, **Auto-Match** behaves more like state data because names align with profiles.

## Operational order (NHSCA)

1. Import JSON  
2. **Expand names from NCHSAA** (optional but recommended for NC)  
3. Auto-Match  
4. Manual **Find profile** for anything still unmatched  
5. Merge into profiles (if you still use JSON merge for that year)

## SQL import (full names — skip matching for profiles)

`getNHSCAFromTables` matches **`athlete_name` on the row** to the profile name (exact / variants / ilike). It does **not** require `athlete_id` or `match_status = matched`.

So if your import uses **full names** that match RecruitNC profiles, you can skip Auto-Match / Find profile entirely for **profile display**.

```bash
node scripts/nhsca-json-to-sql.mjs scripts/data/seniors-2026-nhsca-import.json > scripts/data/seniors-2026-nhsca-placements.sql
```

Run the generated SQL in the Supabase SQL editor (same effect as bulk-import API: delete that year’s NC rows, then insert). Rows are inserted with `match_status = 'unmatched'`; that is fine for table-backed NHSCA on unified profiles.

**Merge into Profiles** is only needed if you rely on **`athletes.nhsca_results` JSON** somewhere without the table merge — most unified paths already merge table + JSON in `lib/public-profile-data.ts`.

## Future

Long-term, prefer **inserting canonical names at import time** (or importing from the same pipeline that feeds `wrestling_nchsaa_results` spelling). The resolver above closes the gap without another manual spreadsheet.
