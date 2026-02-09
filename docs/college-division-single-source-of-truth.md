# College division: single source of truth

All division display (Blue alumni table, College tab, APIs) comes from **one place**: `lib/get-division-from-mappings.ts`, which reads:

1. **`college_division_mappings`** (primary) — columns: `college_name`, `division`
2. **`college_master`** + **`college_aliases`** (fallback) — so any college in either table is found

**Full form (store in DB, use when space allows):** Spell out NCAA; use Roman numerals I, II, III.

- **NCAA Division I**
- **NCAA Division II**
- **NCAA Division III**
- **NAIA**
- **NJCAA**
- **Club (NCWA)** (if you track club/NCWA)

**Abbreviated (cards, filters, tables):** Use `getDivisionDisplayShort()` from `lib/division-display.ts`:

- NCAA D-I, NCAA D-II, NCAA D-III, NAIA, NJCAA, Club (NCWA)

Do not mix "D1" with "Division I" — use the helpers in `lib/division-display.ts` everywhere. Anything else (D1, NCAA DI, JUCO, etc.) is normalized. If a college is not in either table, or has no division set, the UI shows **Unknown**.

## Why you see "Unknown" for all

- **`college_division_mappings`** is empty or the college names don’t match what’s stored in `athletes.college` (e.g. athlete has "App State", table has "Appalachian State").
- **`college_master`** isn’t populated or doesn’t have `division` set; aliases help match different spellings.

## How to fix it

1. **Seed the mappings table**  
   Call `POST /api/setup-college-mappings-table` once to create and seed `college_division_mappings` with a starter set (UNC, NC State, Duke, UNCP, etc.). You can also insert rows in Supabase → Table Editor → `college_division_mappings` with `college_name` and `division` (use the canonical labels above).

2. **Add more colleges**  
   Insert one row per college with the **exact** name as it appears in athlete records (or add an alias in `college_aliases` that matches). Use canonical `division` values only.

3. **Use `college_master` for one record per school**  
   Add rows to `college_master` (`canonical_name`, `display_name`, `division`) and use `college_aliases` for alternate names (e.g. "UNC", "North Carolina") so lookups still find the same division.

4. **Keep names consistent**  
   The lookup is case-insensitive and does partial matching, but exact matches are best. Prefer the same spelling you use in `athletes.college` when you insert into `college_division_mappings` or `college_master` / `college_aliases`.

After updating either table, the cache refreshes within 5 minutes (or on next request). No deploy needed.
