# Division & College Tracking: Full Revamp Contingency Plan

**When to use this:** If the current division fix (single source in `college_division_mappings`, read-from-mappings everywhere) still fails—wrong division on cards, school portal, or stats—this doc outlines how to revamp and rewrite the system.

---

## 0. DB cleanup (division removed from app)

After the codebase was stripped of all division (college/athlete), run this in **Supabase SQL Editor** to remove division from the database:

```sql
-- Drop the college_division_mappings table and all its data.
DROP TABLE IF EXISTS college_division_mappings;

-- Remove division column from athletes (if it exists).
ALTER TABLE athletes DROP COLUMN IF EXISTS division;
```

College names on `athletes` are unchanged; only division data and the mappings table are removed.

---

## 1. Why the current approach might still fail

- **Caching:** `getDivisionFromMappings` has a 30s in-memory cache; CDN/Next cache might serve stale responses; revalidate paths might not hit all surfaces.
- **Dual storage:** We still have `athletes.division` and `college_division_mappings`. Any path that reads from the wrong place or that doesn’t run the sync will show wrong data.
- **Free-text college:** `athletes.college` is a string. Typos, “Lynchburg” vs “Lynchburg College,” and casing can break lookups even with longest-match.
- **Many entry points:** Featured-athletes, athletes API, stats, nc-recruits, Blue Alumni, unified profile, admin form, Blue inline edit. One missed path = inconsistent display.

---

## 2. Revamp options (from minimal to full rewrite)

### Option A: Minimal — Single writer, no dual storage on read

**Idea:** Keep `college_division_mappings` as source of truth. **Stop reading `athletes.division` for display anywhere.** All display paths resolve division from `getDivisionFromMappings(athlete.college)` only. Keep writing `athletes.division` only for **filtering** (DB index on division for list filters); treat it as a cache that’s updated by one writer.

**Changes:**
- Audit every read path (cards, portal, stats, profile, Blue) and ensure **zero** use of raw `athlete.division` for display; always resolve from mappings by college.
- Single writer for `athletes.division`: only the “Sync athlete divisions” job (or a DB trigger on `college_division_mappings`) updates it. Admin form and Blue inline edit **only** upsert `college_division_mappings`; they do **not** write to `athletes.division`. Sync job runs after any mapping change (or on a schedule).
- Cache invalidation: when mappings or athlete college changes, call `clearDivisionMappingsCache()` and revalidate all relevant routes (home, athletes, blue, stats, school portal).

**Pros:** Smallest change; no schema change.  
**Cons:** Filters still depend on sync job; if sync is delayed, filter by division can be briefly wrong.

---

### Option B: Drop `athletes.division` — Resolve only at read time

**Idea:** Remove reliance on `athletes.division` for **both** display and filtering. Division is **only** in `college_division_mappings`. Every list and filter that needs division either:
- Fetches athletes, then in app (or in API) resolves division per row via `getDivisionFromMappings(athlete.college)`, and filters in memory, or
- Uses a DB view/function that joins athletes to mappings (longest-match) so filtering can happen in SQL.

**Changes:**
- **Display:** Already moving to “resolve from mappings”; complete the audit so no surface reads `athletes.division`.
- **Filtering:** 
  - **In-memory:** For bounded lists (e.g. ≤500), fetch athletes, resolve division for each, filter in Node. No DB column needed.
  - **In-DB:** Add a Postgres function or view: `get_division_for_college(college_name text)` that reads from `college_division_mappings` (exact + longest match). Use it in a generated column or a view so `WHERE division = 'DIII'` works. Optionally deprecate `athletes.division` or keep it only as a cache filled by a single job.
- **Writes:** Admin and Blue inline only update `college_division_mappings`. No direct write to `athletes.division` from UI.

**Pros:** One source of truth; no sync for display.  
**Cons:** Filtering either in-memory (bounded) or requires DB view/function work.

---

### Option C: Colleges as first-class entities (full rewrite)

**Idea:** Stop storing “college” as free text. Introduce a **colleges** table; athletes reference a college by ID. Division lives only on the college.

**Schema (conceptual):**

```
colleges
  id (uuid, PK)
  name (text, unique)   -- "Roanoke College"
  division (text)      -- "NCAA Division III"
  logo_url (text)
  created_at, updated_at

athletes
  ...
  college_id (uuid, FK -> colleges.id)  -- nullable for prospects
  -- drop or keep athletes.college as deprecated; migrate to college_id
```

**Migration:**
- Backfill `colleges`: distinct `athletes.college` → insert into `colleges`, then set `athletes.college_id` by matching name (fuzzy or exact). Handle “Lynchburg” vs “Lynchburg College” by normalizing or picking canonical.
- Move `college_division_mappings` data into `colleges.division` (one row per college).
- All writes (admin form, Blue inline, add athlete): pick or create college from a **typeahead** (search `colleges` by name); set `athlete.college_id`. Division is edited on the **college** (admin “Colleges” screen), not on the athlete.
- All reads: join `athletes` → `colleges` and use `colleges.division`. No lookup table at read time; one join.

**Pros:** No dual source; no “college name vs division” bugs; filtering and display trivial.  
**Cons:** Big migration; UI must use college picker everywhere; handling new colleges (e.g. “Add college” flow) and duplicate names.

---

### Option D: Division API facade

**Idea:** Regardless of storage, expose **one** way to get division so every surface uses the same contract and implementation can be swapped.

**Implementation:**
- `GET /api/division?college=<encoded name>` → `{ division: "NCAA Division III" }` (from mappings or from `colleges` in Option C).
- Server-side code calls this (or an internal `getDivision(college)` that uses the same logic). Client-side cards that need division get it from the athlete object that was already enriched by the server using this logic.
- If we revamp to Option C, the API implementation switches to “read from colleges table by name/id”; callers don’t change.

**Use this with A, B, or C** so that “how we get division” is centralized and easy to replace.

---

## 3. Recommended order if current fix fails

1. **Verify and harden current fix (Option A style)**  
   - Confirm no display path reads `athletes.division`; all use `getDivisionFromMappings(college)`.  
   - Ensure admin/Blue only write to `college_division_mappings` and that one sync job (or trigger) updates `athletes.division` for filters.  
   - Add explicit cache bust and revalidate on mapping change.

2. **If still broken → Option B**  
   - Remove display dependency on `athletes.division` completely.  
   - Move division filtering to in-memory (for current list sizes) or to a DB view/function.  
   - Single source: `college_division_mappings`; no denormalization for display.

3. **If we need strict data quality and no free-text → Option C**  
   - Design `colleges` table and migration from current `athletes.college` + `college_division_mappings`.  
   - Add college picker UI; migrate athletes to `college_id`; drop or deprecate `athletes.division` and free-text `athletes.college`.

4. **Throughout:** Use a **division API or shared `getDivision` (Option D)** so all call sites stay the same when we swap the backend (mappings vs colleges table).

---

## 4. Quick checklist before declaring “current fix failed”

- [ ] Run “Sync athlete divisions” once after deploy.
- [ ] Hard refresh / no-cache on homepage, /athletes, Blue, school portal; confirm division on cards and tables.
- [ ] Edit one athlete’s division in admin (College tab) and Blue inline; confirm DB and UI update.
- [ ] Check Supabase `college_division_mappings` has the expected rows and no duplicate colleges with conflicting divisions.
- [ ] Confirm no CDN or long-lived cache is serving old API responses (e.g. Vercel cache headers for athletes/featured-athletes/stats).

If all of the above are correct and division is still wrong on a specific surface, the next step is Option B (or C if we want the full college-entity revamp).
