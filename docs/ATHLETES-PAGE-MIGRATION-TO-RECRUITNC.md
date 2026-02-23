# Athletes Page — Migration to RecruitNC (Step-by-step guide)

**Route:** `/athletes` (Legacy NC tab: **Wrestlers** → `/athletes?tab=legacy`)  
**Source:** Legacy NC. **Target:** RecruitNC (same Supabase project).

Use this doc as the **step-by-step guide** for the Athletes (Legacy NC “Wrestlers”) migration. The LEGACYNC tab doc has the high-level Phase 4 summary and points here.

---

## What you're migrating

- **One page:** `app/athletes/page.tsx` — search by name (min 2 chars, 300ms debounce), 11 parallel Supabase queries, merge/dedup in the client, college logos from Clearbit (not DB).
- **Optional:** `components/data-accuracy-form.tsx` — “Report data issue” → insert into `data_accuracy_reports`.

---

## Tables (all read from page except one insert)

| Table | Role |
|-------|------|
| `wrestling_nhsca_results` | NHSCA by athlete name |
| `wrestling_nchsaa_results` | State (limit 1000); deduped client-side |
| `athletes` | **Twice:** (1) commits `recruiting_status = 'active'`, (2) profiles + `nhsca_results` JSONB |
| `winningest_wrestlers` | Single-season wins |
| `career_winningest_wrestlers` | Career wins |
| `most_outstanding_wrestlers` | MOW |
| `dave_schultz_award` | Dave Schultz |
| `tricia_saunders_award` | Tricia Saunders |
| `nhsca_placements` | Match-level NHSCA (optional; can be missing) |
| `super32_results` | Super32 by name |
| `data_accuracy_reports` | Insert only (only if you keep the form) |

---

## 10-step implementation

1. **Copy page (+ optional form); remove form usage if you don’t want it.**  
   Copy `app/athletes/page.tsx`; optionally copy `components/data-accuracy-form.tsx`. If you skip the form, remove `DataAccuracyForm` import, `showDataAccuracyForm` state, the “Report data issue” button, and the `<DataAccuracyForm … />` component.

2. **Swap Supabase to RecruitNC’s browser client** in the page (and in the form if kept).  
   Replace `createClient` from `@/lib/supabase/client` with RecruitNC’s client (e.g. `import { supabase } from "@/lib/supabase"`). Use a single shared client.

3. **Replace or remove AuthGuard.**  
   Use RecruitNC’s auth wrapper or remove it and render the page content directly.

4. **Fix the one profile link.**  
   Find `v0-new-college-commits.vercel.app/athletes/${profile.id}` (single location, around line 1071 in Legacy) and replace with your RecruitNC athlete URL (e.g. `/unified-profile/${profile.id}`).

5. **Add assets.**  
   Ensure `nc-united-logo.png` (e.g. `public/images/nc-united-logo.png`) and `placeholder.svg` (e.g. `public/placeholder.svg`) exist, or use your own placeholder path.

6. **Confirm UI components.**  
   Card, Button, Input, Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger from `@/components/ui/`; Search, Star, MapPin, GraduationCap, AlertTriangle, Trophy, Award from `lucide-react`; Link, Image from Next.

7. **If using the form:** ensure `data_accuracy_reports` exists and RLS allows insert for the role your browser client uses.

8. **Optional: adjust recruiting_status filter for commits** if your DB uses different values (e.g. RecruitNC uses `Committed`, `Signed`, `College Athlete` instead of `active`). Use e.g. `.in("recruiting_status", ["Committed", "Signed", "College Athlete", "committed", "signed"])` instead of `.eq("recruiting_status", "active")`.

9. **Add Legacy NC nav.**  
   In the LEGACYNC section, add **Wrestlers** → `/athletes?tab=legacy` (so it’s clear this is Legacy NC search, not College Commitments). College Commitments stay under main nav → **All Commitments** → `/athletes`.

10. **Smoke test.**  
    Search (min 2 chars), click profile link, and if you kept the form, submit a report and confirm a row in `data_accuracy_reports`.

---

## Important details (from the doc)

- **Exact query pattern per table:** `select` / `.or(column.ilike.%pattern%)` / `limit` as in the LEGACYNC tab doc and the detailed plan. Use name variations to build patterns; run 11 queries in parallel (`Promise.allSettled`).
- **Data flow:** name variations → 11 queries → merge by name/school → dedupe NCHSAA (placer vs SQ) → Clearbit logos for unique college names in commits.
- **Single profile link location:** Legacy has one `href` to `https://v0-new-college-commits.vercel.app/athletes/${profile.id}` (around line 1071). Replace with `/unified-profile/${profile.id}` (or your RecruitNC profile URL).

---

## Checklist (copy-paste and tick off)

- [ ] Copy `app/athletes/page.tsx` to RecruitNC (or implement full Legacy search in the “Wrestlers” tab).
- [ ] Optionally copy `components/data-accuracy-form.tsx`; if not, remove form usage from the page.
- [ ] Replace Supabase `createClient` with RecruitNC’s browser client in the page (and in the form if kept).
- [ ] Replace or remove `AuthGuard` and fix import.
- [ ] Replace `https://v0-new-college-commits.vercel.app/athletes/${profile.id}` with RecruitNC profile URL (e.g. `/unified-profile/${profile.id}`).
- [ ] Add `public/images/nc-united-logo.png` and `public/placeholder.svg` (or your placeholder).
- [ ] Verify UI components and paths (Card, Button, Input, Badge, Tooltip, etc.).
- [ ] If using DataAccuracyForm: create/verify `data_accuracy_reports` table and RLS insert.
- [ ] Optionally adjust `recruiting_status` filter for commits to match your data.
- [ ] Add **Wrestlers** (Legacy NC) → `/athletes?tab=legacy` to RecruitNC nav; keep **All Commitments** → `/athletes` for college commitments.
- [ ] Smoke test: search, profile link, and (if kept) report form submit.

---

## Related docs

- **Phase 4 summary and table list:** `docs/LEGACYNC-TAB-MIGRATION.md` (Athletes / Wrestlers section).
- **Longer plan (query patterns, Data flow, assets):** `docs/ATHLETES-PAGE-DETAILED-MIGRATION-PLAN.md`.
