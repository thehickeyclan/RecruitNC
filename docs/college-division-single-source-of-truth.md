# College division: single source of truth

Division for **any** college, everywhere in RecruitNC and legacy NC, comes from **one place only**: the table **`college_division_mappings`**, read via **`getDivisionFromMappings(collegeName)`** in `lib/get-division-from-mappings.ts`. No other table is used for division (no college_master, no athlete.division for display).

**Full form (store in DB, use when space allows):** Spell out NCAA; use Roman numerals I, II, III.

- **NCAA Division I**
- **NCAA Division II**
- **NCAA Division III**
- **NAIA**
- **NJCAA**
- **Club (NCWA)** (if you track club/NCWA)

**Abbreviated (cards, filters, tables):** Use `getDivisionDisplayShort()` from `lib/division-display.ts`:

- DI, DII, DIII, NAIA, NJCAA, Club (NCWA)

Do not mix "D1" with "Division I" — use the helpers in `lib/division-display.ts` everywhere. If a college is not in `college_division_mappings`, the UI shows **Unknown**.

## Why you see "Unknown"

The table **`college_division_mappings`** is missing that college, or the name doesn’t match what’s in `athletes.college` (e.g. "App State" vs "Appalachian State"). There is no other source for division.

## How to fix it

1. **See what’s missing**  
   Admin → College division mappings: the page lists colleges that appear in your athlete/commit data but are not in the table.

2. **Add rows in Supabase**  
   Table Editor → `college_division_mappings`. Add one row per college: `college_name` = exact string as in athlete records, `division` = one of NCAA Division I, NCAA Division II, NCAA Division III, NAIA, NJCAA.

3. **Seed/upsert**  
   The "Seed college division mappings" button on that admin page upserts a canonical list; run it to fix or add common schools.

After updating the table, the cache refreshes within 5 minutes (or on next request). No deploy needed.

**See also:** `docs/division-one-source-everywhere.md` for the rule that division everywhere (RecruitNC and legacy NC) must use this one source.
