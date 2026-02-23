# LEGACYNC Tab — Migrate to RecruitNC

**Scope:** Everything under the **LEGACYNC** dropdown on the Legacy NC navbar:

| Nav item              | Route                       |
|-----------------------|-----------------------------|
| Wrestlers             | `/athletes?tab=legacy`      |
| Schools               | `/schools`                  |
| Dave Schultz Award    | `/dave-schultz-award`   |
| Tricia Saunders Award | `/tricia-saunders-award`|

**Database:** Same Supabase project. No schema migration. Use RecruitNC's **browser Supabase client** for all four pages.

**Suggested order:** Do **Awards first** (Dave Schultz, Tricia Saunders) — small, two tables each. Then **Schools**, then **Athletes** (largest).

---

## Phase 1: Dave Schultz Award (`/dave-schultz-award`)

### 1.1 Files to copy

| Source (Legacy NC)                | Destination (RecruitNC)           |
|-----------------------------------|-----------------------------------|
| `app/dave-schultz-award/page.tsx` | `app/dave-schultz-award/page.tsx` |

No shared components. No API routes.

### 1.2 Supabase (client only)

| Table                | Usage |
|----------------------|--------|
| `dave_schultz_award` | `select("*")`, order by year desc. |
| `athletes`           | `select("id, name")` — to match winners to athlete profiles for "View Profile" link. |

### 1.3 Data flow

- On load: fetch all from `dave_schultz_award` and all `id, name` from `athletes`.
- Build a map of `name` → `id`; for each winner set `hasProfile` and `athleteId` if name matches.

### 1.4 Fixes in RecruitNC

1. **Supabase**  
   Replace `createClient` from `@/lib/supabase/client` with RecruitNC's browser client (e.g. same import path if you have it, or your client module).

2. **Profile link**  
   Legacy links to `https://v0-new-college-commits.vercel.app/athletes/${athleteId}`. In RecruitNC change to your athlete profile URL, e.g. `/unified-profile/${athleteId}`.

3. **Assets**  
   - RecruitNC hero logo: use `public/images/nc-united-logo.png` (page references `/images/nc-united-logo.png`). Copy from Legacy to that path if missing.  
   - Dave Schultz image: external URL — keep as-is or host in RecruitNC.

4. **Auth**  
   Page has no `AuthGuard` in Legacy; it's public. Keep public or add your auth.

### 1.5 Checklist — Dave Schultz

- [x] Copy / implement `app/dave-schultz-award/page.tsx`.
- [x] Point Supabase to RecruitNC client (`@/lib/supabase`).
- [x] Update "View Profile" href to RecruitNC profile URL (`/unified-profile/${id}`).
- [ ] Copy or ensure `public/images/nc-united-logo.png` exists (page uses `/images/nc-united-logo.png`).
- [x] Add nav: **Dave Schultz Award** → `/dave-schultz-award`.

---

## Phase 2: Tricia Saunders Award (`/tricia-saunders-award`)

### 2.1 Files to copy

| Source (Legacy NC)                     | Destination (RecruitNC)                |
|----------------------------------------|----------------------------------------|
| `app/tricia-saunders-award/page.tsx`   | `app/tricia-saunders-award/page.tsx`   |

No shared components. No API routes.

### 2.2 Supabase (client only)

| Table                    | Usage |
|--------------------------|--------|
| `tricia_saunders_award`  | `select("*")`, order by year desc. |
| `athletes`               | `select("id, name")` to get profile ids for "View Profile". |

### 2.3 Data flow

- On load: fetch all from `tricia_saunders_award`; fetch all `id, name` from `athletes`; build `nameToId[name] = id`.

### 2.4 Fixes in RecruitNC

1. **Supabase** — Same as Dave Schultz — use RecruitNC's browser client.
2. **Profile link** — Legacy uses `https://v0-new-college-commits.vercel.app/athletes/${id}`. Change to `/unified-profile/${id}`.
3. **Assets** — Hero: `public/images/nc-united-logo.png` (same as Phase 1). About section: `public/images/image.png` (Tricia Saunders image). Copy from Legacy NC or add your own image at that path.
4. **Auth** — No AuthGuard; public.

### 2.5 Checklist — Tricia Saunders

- [x] Copy / implement `app/tricia-saunders-award/page.tsx`.
- [x] Point Supabase to RecruitNC client (`@/lib/supabase`).
- [x] Update "View Profile" href to RecruitNC profile URL (`/unified-profile/${id}`).
- [x] Hero logo: `public/images/nc-united-logo.png` (in use). Tricia image: copy `public/images/image.png` from Legacy or add your own at that path when ready.
- [x] Add nav: **Tricia Saunders Award** → `/tricia-saunders-award`.

---

## Phase 3: Schools (`/schools`)

### 3.1 Files to copy

| Source (Legacy NC)           | Destination (RecruitNC)        |
|------------------------------|--------------------------------|
| `app/schools/page.tsx`       | `app/schools/page.tsx`         |
| `lib/school-normalization.ts`| `lib/school-normalization.ts` |

No API routes. All data via client Supabase + optional RPC.

### 3.2 Supabase (client only)

| Table                      | Usage |
|----------------------------|--------|
| `tournament_champions`     | Leaderboard and by-year; order by year. |
| `wrestling_nhsca_results`  | NHSCA aggregates per school. |
| `super32_results`          | Super32 aggregates per school. |
| `wrestling_nchsaa_results` | NCHSAA aggregates; leaderboard and school detail. |
| `dual_team_champions`      | Dual team champs and leaderboard. |
| `athletes`                 | College commits for selected school. |
| `most_outstanding_wrestlers` | MOW for selected school. |
| `wrestling_commits`        | Commit data for school detail (if used). |

**Optional RPC:** `normalize_school_name`. If missing, lib uses client-side `normalizeSchoolNameForDisplay`.

### 3.3 Dependencies

- **UI:** Card, Button, Input, Badge, Tabs, Table, Select, Switch, Label from `@/components/ui/`.
- **Auth:** `AuthGuard` from `@/components/auth-guard`. Replace with RecruitNC's guard or remove for public.
- **Lib:** `normalizeSchoolNameForSearch`, `createSchoolSearchPatterns` from `@/lib/school-normalization`.

### 3.4 Checklist — Schools

- [ ] Copy `app/schools/page.tsx` from Legacy NC.
- [x] Add `lib/school-normalization.ts` (stub in RecruitNC; replace with full copy from Legacy).
- [ ] Point Supabase to RecruitNC client.
- [ ] Replace or remove AuthGuard.
- [x] Add nav: **Schools** → `/schools`.
- [ ] Verify RLS (or anon read) for all tables above.

---

## Phase 4: Athletes / Wrestlers (Legacy NC search)

**Step-by-step guide:** **`docs/ATHLETES-PAGE-MIGRATION-TO-RECRUITNC.md`** — 10-step implementation, tables, checklist, profile link and asset notes.  
**Longer reference:** `docs/ATHLETES-PAGE-DETAILED-MIGRATION-PLAN.md` — query patterns, data flow, Clearbit logos.

### 4.1 Files to copy

| Source (Legacy NC)              | Destination (RecruitNC)          |
|---------------------------------|----------------------------------|
| `app/athletes/page.tsx`         | `app/athletes/page.tsx`          |
| `components/data-accuracy-form.tsx` | `components/data-accuracy-form.tsx` |

No API routes. All data via client Supabase. College logos: Clearbit (`https://logo.clearbit.com/${domain}.edu`).

### 4.2 Supabase (client only)

| Table                         | Usage |
|-------------------------------|--------|
| `wrestling_nhsca_results`     | Search by athlete name (ilike patterns). |
| `wrestling_nchsaa_results`    | Search by wrestler_name; limit 1000. |
| `athletes`                    | Profiles and commits. |
| `winningest_wrestlers`        | Single-season wins. |
| `career_winningest_wrestlers`  | Career wins. |
| `most_outstanding_wrestlers`  | MOW; search by name. |
| `dave_schultz_award`          | Search by name. |
| `tricia_saunders_award`       | Search by name. |
| `nhsca_placements`            | Match-level NHSCA (optional). |
| `super32_results`             | Search by athlete_name. |

**DataAccuracyForm (optional):** `data_accuracy_reports` — insert.

### 4.3 Fixes in RecruitNC

1. **Supabase** — RecruitNC browser client in page and DataAccuracyForm.
2. **AuthGuard** — Replace or remove.
3. **DataAccuracyForm** — Optional; ensure `data_accuracy_reports` exists and insert allowed.
4. **Profile links** — Point to RecruitNC profile URL (e.g. `/unified-profile/${id}`).

### 4.4 Checklist — Athletes

- [x] Add Legacy NC search to `app/athletes/page.tsx` (tab: College Commitments | Legacy Search; RecruitNC kept commitments view).
- [ ] If desired: copy `components/data-accuracy-form.tsx` (optional).
- [x] Point Supabase to RecruitNC client (`supabase` from `@/lib/supabase`) for Legacy search.
- [x] Update athlete profile links to RecruitNC URLs (`/unified-profile/${id}`) in Legacy results.
- [x] Add nav: **Wrestlers** (Legacy NC) → `/athletes?tab=legacy`. (College Commitments remain under main nav → **All Commitments** → `/athletes`.)
- [ ] Verify RLS/anon read for all tables used by Legacy search (athletes, wrestling_nhsca_results, wrestling_nchsaa_results, most_outstanding_wrestlers, dave_schultz_award, tricia_saunders_award, super32_results, winningest_wrestlers, career_winningest_wrestlers).

---

## RecruitNC nav (LEGACYNC section)

RecruitNC navbar has a **Legacy NC** dropdown (desktop + mobile) with:

- **Wrestlers** → `/athletes?tab=legacy` (Legacy NC search by name; distinct from **College Commitments** at `/athletes`)
- **Schools** → `/schools`
- **Dave Schultz Award** → `/dave-schultz-award`
- **Tricia Saunders Award** → `/tricia-saunders-award`

**Important:** “Athletes” under **Committed / All Commitments** = RecruitNC college commitments. “Wrestlers” under **Legacy NC** = Legacy search (NHSCA, NCHSAA, awards, etc.). Same route `/athletes` but different tab and intent.

---

## Shared notes (all four)

- **Same Supabase project** — no new env vars. Use RecruitNC browser client (`@/lib/supabase`).
- **Auth** — Legacy uses AuthGuard on Athletes and Schools; Awards are public. RecruitNC: Awards pages are public; Schools has AuthGuard; Athletes has AuthGuard.
- **Profile links** — Use `/unified-profile/${id}` for athlete profile in RecruitNC.
