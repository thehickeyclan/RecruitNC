# Athletes Page — Detailed Migration Plan (Legacy NC → RecruitNC)

**Route:** `/athletes` (Legacy NC: **Wrestlers** → `/athletes?tab=legacy`)  
**Source:** Legacy NC. **Target:** RecruitNC (same Supabase project).

**Use the step-by-step guide first:** **`docs/ATHLETES-PAGE-MIGRATION-TO-RECRUITNC.md`**. This doc adds query patterns, data flow, and extra detail.

---

## 1. What you're migrating

| Item | Description |
|------|-------------|
| **Main page** | Search-by-name athlete aggregator: NHSCA, NCHSAA, Super32, college commits, winningest, MOW, Dave Schultz, Tricia Saunders, profiles. Min 2 characters; 300ms debounce; 11 parallel Supabase queries. |
| **Optional form** | "Report Data Accuracy Issue" modal that inserts into `data_accuracy_reports`. |
| **College logos** | Fetched at runtime from **Clearbit** (`https://logo.clearbit.com/{domain}.edu`), not from Supabase. |
| **Auth** | Page is wrapped in `AuthGuard` in Legacy; you can keep guard or make public. |

---

## 2. Files to copy

| Copy from (Legacy NC) | Copy to (RecruitNC) |
|------------------------|---------------------|
| `app/athletes/page.tsx` | `app/athletes/page.tsx` |
| `components/data-accuracy-form.tsx` | `components/data-accuracy-form.tsx` *(optional)* |

No API routes. No other components. No libs (search logic is inline in the page).

---

## 3. Supabase tables (all client-side read except one insert)

### 3.1 Tables used by the Athletes page (read)

Every search runs **11 queries in parallel** with `Promise.allSettled`. If a table is missing, that query "fails" and is treated as empty — the page still works with the rest.

| Table | Query pattern | Purpose |
|-------|----------------|--------|
| `wrestling_nhsca_results` | `select("*").or(athlete_name ilike patterns)` | NHSCA results per athlete. |
| `wrestling_nchsaa_results` | `select("*").or(wrestler_name ilike patterns).limit(1000)` | State results; deduped client-side (placer vs SQ, 2026 vs older). |
| `athletes` (commits) | `select("*").eq("recruiting_status","active").or(name ilike patterns)` | College commits / active recruits. |
| `winningest_wrestlers` | `select("*").or(wrestler_name ilike patterns)` | Single-season wins. |
| `career_winningest_wrestlers` | `select("*").or(name ilike patterns)` | Career wins. |
| `most_outstanding_wrestlers` | `select("*").or(name ilike patterns)` | MOW awards. |
| `dave_schultz_award` | `select("*").or(name ilike patterns)` | Dave Schultz winners. |
| `tricia_saunders_award` | `select("*").or(name ilike patterns)` | Tricia Saunders winners. |
| `athletes` (profiles) | `select("*, nhsca_results").or(name ilike patterns)` | Full profiles + `nhsca_results` JSONB. |
| `nhsca_placements` | `select("*").or(athlete_name ilike).in("match_status", ["auto_matched","manually_matched","merged"])` | Match-level NHSCA. Optional; can be missing. |
| `super32_results` | `select("*").or(athlete_name ilike).order("year",{ascending:false})` | Super32 results. |

**RecruitNC:** Ensure RLS (or anon key) allows **select** on these tables. Same DB = same schema; only client import changes.

### 3.2 Table used by DataAccuracyForm (write, optional)

| Table | Operation | Columns (concept) |
|-------|-----------|-------------------|
| `data_accuracy_reports` | **insert** | reporter_name, reporter_email, report_type, athlete_name, school_name, description, specific_details, suggested_correction |

If you **don't** use the form, you don't need this table. If you **do**, create the table in Supabase (or use Legacy's schema) and allow insert (e.g. anon or authenticated).

---

## 4. Step-by-step implementation in RecruitNC

### Step 1: Copy the page and optional form

- Copy `app/athletes/page.tsx` into RecruitNC at `app/athletes/page.tsx`.
- Decide: **with or without** "Report data issue":
  - **With:** Copy `components/data-accuracy-form.tsx` into RecruitNC.
  - **Without:** After pasting the page, remove the `DataAccuracyForm` import, all `showDataAccuracyForm` state and the "Report data issue" button, and the `<DataAccuracyForm isOpen={...} onClose={...} />` component.

### Step 2: Point Supabase to RecruitNC client

- In **`app/athletes/page.tsx`**:
  - Find: `import { createClient } from "@/lib/supabase/client"` and `const supabase = createClient()`.
  - Replace with RecruitNC's browser Supabase client (e.g. same path if you use `@/lib/supabase/client`, or your auth/client module). Use a single shared client (singleton) so you don't create multiple instances.
- In **`components/data-accuracy-form.tsx`** (if you kept it):
  - Same change: replace `createClient` from `@/lib/supabase/client` with RecruitNC's client.

### Step 3: Auth (AuthGuard)

- In `app/athletes/page.tsx` the default export is:
  ```tsx
  export default function AthletesPage() {
    return (
      <AuthGuard>
        <AthletesPageContent />
      </AuthGuard>
    )
  }
  ```
- **Option A:** Use RecruitNC's auth guard: replace `AuthGuard` with your wrapper (e.g. `RequireAuth` or similar) and fix the import.
- **Option B:** Make the page public: remove `AuthGuard` and render `<AthletesPageContent />` only.

### Step 4: Fix athlete profile link

- In `app/athletes/page.tsx` search for:
  - `v0-new-college-commits.vercel.app` or `https://v0-new-college-commits.vercel.app/athletes/`
- Replace with RecruitNC's athlete profile URL. Single occurrence:
  - Line ~1071: `href={\`https://v0-new-college-commits.vercel.app/athletes/${profile.id}\`}`
  - Change to e.g. `href={\`/athletes/${profile.id}\`}` or your base URL + `/athletes/${profile.id}`.

### Step 5: Assets

- **Logo:** Ensure `public/nc-united-logo.png` exists in RecruitNC (copy from Legacy if needed). The page uses it in the hero.
- **Placeholder:** The page uses `/placeholder.svg` for missing college logos (lines ~1061 and ~1103). Either add `public/placeholder.svg` in RecruitNC or replace with your own placeholder path (e.g. `/images/placeholder-avatar.svg`).

### Step 6: UI components

Ensure RecruitNC has these (or equivalent paths):

- From `@/components/ui/`: `Input`, `Button`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `Badge`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`.
- From `lucide-react`: `Search`, `Star`, `MapPin`, `GraduationCap`, `AlertTriangle`, `Trophy`, `Award`.
- Next: `Link`, `Image`.

If your UI lives under a different path (e.g. `@/components/ui/...`), adjust imports.

### Step 7: DataAccuracyForm (if you kept it)

- Ensure table `data_accuracy_reports` exists in Supabase with columns compatible with the form (reporter_name, reporter_email, report_type, athlete_name, school_name, description, specific_details, suggested_correction).
- Ensure RLS (or anon policy) allows **insert** for the role your browser client uses.
- Test: open Athletes → click "Report data issue" → submit; check a row appears in `data_accuracy_reports`.

### Step 8: Optional: recruiting_status

- The page queries commits with `.eq("recruiting_status", "active")`. If RecruitNC uses different values (e.g. "Committed", "College Athlete"), either:
  - Change the filter to match your schema (e.g. `.in("recruiting_status", ["Committed", "College Athlete", "active"])`), or
  - Keep "active" if that's how you mark active recruits in the same DB.

### Step 9: Nav

- Add **Athletes** to the LEGACYNC (or equivalent) section of RecruitNC's navbar → link to `/athletes`.

### Step 10: Smoke test

- Open `/athletes`.
- Type at least 2 characters (e.g. a known wrestler name). You should see aggregated results (NHSCA, NCHSAA, commits, etc.) and college logos loading from Clearbit where available.
- Click an athlete profile link → should go to RecruitNC athlete profile.
- If you kept the form: open "Report data issue", submit, and confirm insert.

---

## 5. Query summary (for reference)

- **Search flow:** User input → normalize and build name variations (fuzzy) → build `finalPatterns` → run 11 Supabase queries in parallel → merge by name → dedupe NCHSAA → set results → fetch college logos from Clearbit for unique college names in commits.
- **College logos:** `https://logo.clearbit.com/${collegeUrl}.edu` (no Supabase). If Clearbit fails, the page uses `/placeholder.svg`.
- **No pagination:** NCHSAA is limited to 1000 rows per search; the rest are unbounded (ilike filters). For very common names you may want to add limits later in RecruitNC.

---

## 6. Checklist (copy-paste)

- [ ] Copy `app/athletes/page.tsx` to RecruitNC.
- [ ] Optionally copy `components/data-accuracy-form.tsx`; if not, remove form usage from the page.
- [ ] Replace Supabase `createClient` with RecruitNC's browser client in the page (and in the form if kept).
- [ ] Replace or remove `AuthGuard` and fix import.
- [ ] Replace `https://v0-new-college-commits.vercel.app/athletes/${profile.id}` with RecruitNC athlete URL (e.g. `/athletes/${profile.id}`).
- [ ] Add `public/nc-united-logo.png` and `public/placeholder.svg` (or your placeholder).
- [ ] Verify UI components and paths (Card, Button, Input, Badge, Tooltip, etc.).
- [ ] If using DataAccuracyForm: create/verify `data_accuracy_reports` table and RLS insert.
- [ ] Optionally adjust `recruiting_status` filter for commits to match your data.
- [ ] Add **Athletes** → `/athletes` to RecruitNC nav.
- [ ] Smoke test: search, profile link, and (if kept) report form submit.

---

## 7. Link to LEGACYNC tab doc

This page is **Phase 4** of the LEGACYNC tab migration. Overview and order: **`docs/LEGACYNC-TAB-MIGRATION.md`**.

---

## 8. RecruitNC implementation status

- **Legacy Search** is implemented as a tab on `/athletes` (with **College Commitments**): 11 parallel Supabase queries, name variations (comma-free for `.or(ilike)`), 300ms debounce, min 2 characters. Profile links use `/unified-profile/${id}`. Commits use `recruiting_status` in `["Committed", "Signed", "College Athlete", "committed", "signed"]`. Optional tables (`nhsca_placements`, `winningest_wrestlers`, `career_winningest_wrestlers`) are queried with `.catch()` so missing tables don’t break the page.
- **Assets:** `public/images/nc-united-logo.png` and `public/placeholder.svg` exist.
- **DataAccuracyForm** is not yet added; add `components/data-accuracy-form.tsx` and wire the “Report data issue” button when desired.
