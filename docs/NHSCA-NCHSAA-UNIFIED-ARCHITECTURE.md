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

## Future

Long-term, prefer **inserting canonical names at import time** (or importing from the same pipeline that feeds `wrestling_nhsca_results` spelling). The resolver above closes the gap without another manual spreadsheet.
