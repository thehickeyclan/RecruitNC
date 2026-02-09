# Division: Single-Update Fix Plan

**Goal:** One source of truth, one read path, one write path. Every surface (athlete cards, Blue Alumni, admin edit, stats, homepage, filters) uses the same logic. No scattered fixes.

---

## 1. Current state (what’s wrong)

### Source of truth (intended)
- **`college_division_mappings`** (Supabase): `college_name`, `division`. This is the only table that defines “what division is this college?”
- **`athletes.division`**: Stored on each athlete. Should be kept in sync with the mapping for that athlete’s college (for display/filter performance and so admin “division” is correct).

### Where division is READ (display)
| Surface | Current behavior | Issue |
|--------|-------------------|-------|
| **Athlete cards / lists** | `/api/athletes` overwrites each athlete’s division with `getDivisionFromMappings(college)` before returning. | Correct if API is hit; cached or wrong build can still show stale. |
| **Blue Alumni** | `getBlueAlumni()` reads `college_division_mappings` in same request, longest-match lookup. | Correct in code; deployment/cache has shown wrong. |
| **Featured athletes** | `/api/featured-athletes`: mix of `getDivisionFromMappings(college)` and fallback to `athlete.division` and hardcoded "NCAA Division I". | Inconsistent; some paths ignore mappings. |
| **Stats / homepage** | `/api/stats`: reads **`athletes.division`** only (no mappings). Uses `extractDivision(a)` from raw athlete. | Ignores `college_division_mappings`; counts wrong if `athletes.division` is wrong. |
| **Colleges API** | Reads mappings + athletes; partial match. | Can be wrong if mappings missing or match order wrong. |
| **Prospects** | Filters by `athletes.division`. | Depends on `athletes.division` being correct. |
| **School portal / athlete pages** | Display `recruit.division` / athlete.division. | Raw DB column; no mappings. |

### Where division is WRITTEN (save)
| Surface | Current behavior | Issue |
|--------|-------------------|-------|
| **Admin edit athlete (College tab)** | **AthleteForm** (used by edit page) includes `division` in `submissionData` and calls `updateAthleteAction(id, data)`. `mapAthleteToDb` includes `division`. **BUT** `filterPayloadToSchema` uses either (1) columns from a sample DB row or (2) `KNOWN_ATHLETE_COLUMNS`. **`division` is not in `KNOWN_ATHLETE_COLUMNS`.** So if the schema is taken from an empty table or a row that omits `division`, division is stripped and never saved. | **Root cause:** division can be dropped before the DB update. |
| **Blue Alumni inline edit** | PATCH `/api/admin/athletes/[id]/division` updates `athletes.division` and upserts `college_division_mappings`. | Works when API is called with credentials; toasts added for feedback. |
| **Sync athlete divisions** | POST `/api/admin/sync-athlete-divisions`: overwrites all `athletes.division` from mappings. | Correct. |
| **Add athlete / complete flow** | Writes `body.division` to athletes; some flows upsert mappings. | Depends on caller sending division. |

### Other issues
- **Stats API** does not use `college_division_mappings`; it only reads `athletes.division`. So homepage division breakdown is wrong whenever `athletes.division` is wrong.
- **Featured athletes** has three code paths (mappings, athlete.division, hardcoded DI); not a single path.
- **Filter by division** (e.g. athletes list): filter uses `athletes.division` in the DB query, then the API overwrites division in the response with mappings. So filter is on old data; display is from mappings. Inconsistent.

---

## 2. Single-update fix plan

### Principle
- **Single source of truth:** `college_division_mappings` (plus optional sync into `athletes.division` for performance and admin).
- **Single read helper:** One function that, given a college name, returns division (from mappings only). Used everywhere we need “division for this college.”
- **Single write path for “set athlete division”:** Always update `athletes.division` and optionally upsert `college_division_mappings` for that college. No path that “refuses” to save division.

---

### Step 1: Ensure division is never stripped on save (admin athlete edit)

**File:** `lib/athletes-schema.ts`

- Add `"division"`, `"college"`, `"commitmentdate"` to `KNOWN_ATHLETE_COLUMNS` so `filterPayloadToSchema` never drops them when using the fallback column set (e.g. empty table).

**File:** `components/athlete-form.tsx`

- Confirm initial state sets `division: initialData?.division ?? ""` (or equivalent) so the College tab dropdown has the current value.
- Confirm `submissionData` includes `division` (it does) and that it’s passed through to `onSubmit` (it is). No change if already correct; otherwise ensure the form state key matches what the edit page sends to `updateAthleteAction`.

**Verification:** Edit an athlete, change only Division on the College tab, Save. Reload; division should be updated. Check DB row for that athlete.

---

### Step 2: Single read path for “division for a college”

**Keep:** `lib/get-division-from-mappings.ts` as the only place that reads from `college_division_mappings` (exact + longest-match). No overrides, no hardcoding.

**Use it everywhere we need “division for this college”:**

- **`/api/athletes`** – Already uses `getDivisionFromMappings(athlete.college)` for each athlete in the response. Keep; ensure no caching of the route (already force-dynamic / no-store).
- **`/api/featured-athletes`** – Remove fallbacks to `athlete.division` and hardcoded "NCAA Division I". For each athlete, set `division = await getDivisionFromMappings(athlete.college) || "Unknown Division"` (or one canonical “unknown” label). One path only.
- **`/api/stats`** – Today it only uses `athletes.division`. Change to: for each athlete, get division from `getDivisionFromMappings(athlete.college)` (or from a single batch of mappings and a local lookup). Then aggregate DI/DII/DIII/NAIA/NJCAA from that. So stats reflect the same source as the rest of the app.
- **Blue Alumni** – Already uses mappings in `getBlueAlumni()`. No change except ensuring deployment serves this code.
- **Colleges API** – Already uses mappings; keep longest-match behavior consistent with `get-division-from-mappings` (or call the same helper if we expose a batch API).
- **Prospects** – If we filter by division, either (1) filter in app after resolving division from mappings, or (2) keep filtering on `athletes.division` but run “Sync athlete divisions” so the column is up to date. Prefer (2) for performance and one less behavioral split.
- **School portal / athlete profile pages** – Where they show `recruit.division` or `athlete.division`: either ensure that value is always synced from mappings (via sync job or on read), or resolve division from college at render time with `getDivisionFromMappings`. Prefer resolving at read time for public-facing pages so we don’t depend on sync timing.

**Display format:** Keep `lib/division-display.ts`: one place for “full” (e.g. NCAA Division III) vs “short” (e.g. DIII). All UIs use `getDivisionDisplayShort` or `getDivisionDisplayFull` so labels are consistent.

---

### Step 3: Single write path for “set athlete’s division”

**Paths that must persist division:**

1. **Admin edit athlete (College tab)** – Form submits `division` → `updateAthleteAction` → `mapAthleteToDb` → `filterPayloadToSchema` must not drop `division` (Step 1) → `athletes.update`. After update, if `data.college && data.division`, call `upsertCollegeDivisionMapping(adminSupabase, data.college, data.division)`. Already in `athlete-actions.ts`; ensure it runs.
2. **Blue Alumni inline edit** – Already: PATCH `/api/admin/athletes/[id]/division` updates `athletes.division` and upserts mapping. Keep.
3. **Sync athlete divisions** – Already overwrites all `athletes.division` from mappings. Keep; run after any bulk mapping change.

**No other code path** should write to `athletes.division` or to `college_division_mappings` without going through this logic (or the sync). Deprecate/remove one-off “fix” routes that write division in isolation if they duplicate this.

---

### Step 4: Filters and lists

- **Athletes list filter by division** – Filter runs on DB: `athletes.division` in (list of canonical values). So `athletes.division` must be correct. After Step 1 and Step 3, admin save and Blue inline edit keep it correct; run “Sync athlete divisions” once after fixing mappings so historical rows match. Then filters are consistent with display.
- **Prospects filter by division** – Same: rely on `athletes.division` and sync.

---

### Step 5: One-time data and deployment sanity check

1. **DB:** Ensure `college_division_mappings` has the correct rows (you already have the SQL export). No duplicate college names with conflicting divisions; use longest-match so “Roanoke College” and “Roanoke” can both exist and resolve correctly.
2. **Sync:** Run “Sync athlete divisions” once so every athlete’s `division` matches their college in the mappings.
3. **Deploy:** Single deploy that includes: athletes-schema (division in KNOWN_ATHLETE_COLUMNS), featured-athletes (only mappings), stats (divisions from mappings), and any form/schema fix. Confirm the deployed app is the one behind your production domain (no stale preview or wrong project).
4. **Smoke test:** One athlete: change division on College tab → Save → reload → check DB and UI. One athlete: change division on Blue Alumni inline → toast “Saved” → check DB. Homepage stats: division breakdown matches expectations. Athlete cards: show DII/DIII where expected.

---

## 3. File checklist (minimal set of changes)

| File | Change |
|------|--------|
| `lib/athletes-schema.ts` | Add `"division"`, `"college"`, `"commitmentdate"` to `KNOWN_ATHLETE_COLUMNS`. |
| `app/api/featured-athletes/route.ts` | Use only `getDivisionFromMappings(athlete.college)` for division; remove fallback to `athlete.division` and remove hardcoded "NCAA Division I". |
| `app/api/stats/route.ts` | For division breakdown, resolve division per athlete via `getDivisionFromMappings(athlete.college)` (or one batch read of mappings + in-memory lookup) instead of raw `athletes.division`. |
| `components/athlete-form.tsx` | Only if needed: ensure `division` is in initial state and in `submissionData` (already appears to be). |
| No new routes | Use existing: PATCH admin athletes division, sync-athlete-divisions, updateAthleteAction. |

---

## 4. What not to do

- Don’t add more one-off “fix division” API routes.
- Don’t add overrides or hardcoded division maps in the read path; only `college_division_mappings` and `getDivisionFromMappings`.
- Don’t change display format in 10 places; keep `division-display.ts` as the single place for DI/DII/DIII labels.
- Don’t fix “deployment” by changing code in 20 files; fix the one schema/filter drop, then one deploy and verify.

---

## 5. Order of operations

1. **Schema:** Update `KNOWN_ATHLETE_COLUMNS` in `lib/athletes-schema.ts`.
2. **Featured athletes:** In `app/api/featured-athletes/route.ts`, single division path from mappings.
3. **Stats:** In `app/api/stats/route.ts`, compute division breakdown from mappings (or synced `athletes.division` after a sync).
4. **Verify admin save:** Confirm athlete-form sends division and that it’s in the update payload (add a single log in updateAthleteAction for `division` if needed).
5. **Deploy once** with the above.
6. **Run “Sync athlete divisions”** once after deploy.
7. **Smoke test** as in Step 5 above.

This plan ties every division read to one source (mappings) and every division write to one path (update athlete + optional upsert mapping), and ensures the admin College tab save is never stripped by the schema filter.
