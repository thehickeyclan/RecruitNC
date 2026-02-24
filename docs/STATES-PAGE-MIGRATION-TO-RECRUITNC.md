# STATES Tab (NCHSAA) — Migrate to RecruitNC

**Scope:** Everything under the **STATES** dropdown on the Legacy NC navbar:

| Nav item           | Route          |
|--------------------|----------------|
| Tournament Overview| `/nchsaa`      |
| 2026 Results       | `/nchsaa/2026` |
| 2025 Results       | `/nchsaa/2025` |
| Digital Archive    | `/nchsaa/archive` |

**Database:** Same Supabase project. Use RecruitNC's **browser Supabase client** for all pages that query data. No API routes.

**Suggested order:** Phase 1 (Overview) → Phase 2 (Year results) → Phase 3 (Archive).

---

## Phase 1: Tournament Overview (`/nchsaa`)

### 1.1 Files to copy

| Source (Legacy NC)     | Destination (RecruitNC) |
|------------------------|-------------------------|
| `app/nchsaa/page.tsx`  | `app/nchsaa/page.tsx`   |
| `lib/regional-data.ts` | `lib/regional-data.ts`  |

No loading.tsx in Legacy for the overview (only for [year] and archive). No Supabase on this page.

### 1.2 Data source

- **Static in page:** `classificationData` (8A, 7A, 6A, … with school lists and descriptions) is **inline** in `app/nchsaa/page.tsx`.
- **From lib:** `regionsData` from `@/lib/regional-data` — East/West regions and school lists per classification (used for collapsible sections and "find my region").

### 1.3 Dependencies

- **UI:** Card, Button, Badge, Collapsible, CollapsibleContent, CollapsibleTrigger from `@/components/ui/`.
- **Icons:** Crown, Calendar, ArrowRight, Star, TrendingUp, ChevronDown, School, Archive, MapPin from `lucide-react`.
- **Next:** Link, Image.
- **Auth:** `AuthGuard` from `@/components/auth-guard`.

### 1.4 Fixes in RecruitNC

1. **Auth:** Replace or remove `AuthGuard` (page uses it).
2. **Paths:** Ensure `@/lib/regional-data` and `@/components/ui/*` resolve.
3. **Assets:** Page may reference images; check for `/nc-united-logo.png` or similar and copy if needed.
4. **Links:** Overview links to `/nchsaa/2026`, `/nchsaa/2025`, `/nchsaa/archive` — keep as-is once those routes exist.

### 1.5 Checklist — Overview

- [ ] Copy `app/nchsaa/page.tsx` and `lib/regional-data.ts`.
- [ ] Replace or remove AuthGuard.
- [ ] Add nav: **Tournament Overview** → `/nchsaa`.

---

## Phase 2: Year results (`/nchsaa/2026`, `/nchsaa/2025`)

### 2.1 Files to copy

| Source (Legacy NC)              | Destination (RecruitNC)             |
|---------------------------------|-------------------------------------|
| `app/nchsaa/[year]/page.tsx`    | `app/nchsaa/[year]/page.tsx`        |
| `app/nchsaa/[year]/loading.tsx` | `app/nchsaa/[year]/loading.tsx`     |
| `components/tournament-bracket-modal.tsx` | `components/tournament-bracket-modal.tsx` |

### 2.2 Supabase (client only)

| Table                     | Query | Purpose |
|---------------------------|--------|---------|
| `wrestling_nchsaa_results`| `select("*").eq("year", year).order("classification").order("weight_class").order("place")` | State results for the year; grouped by classification and weight. |
| `most_outstanding_wrestlers` | `select("*").eq("year", year).order("division")` | MOW for that year. |
| `tournament_champions`    | `select("*").eq("year", year).order("division")` | Team points winners (champion_school, points) for that year. |

### 2.3 Component: TournamentBracketModal

- **No Supabase.** It's a modal that shows **bracket images** from hardcoded URLs (Vercel Blob: `hebbkx1anhila5yf.public.blob.vercel-storage.com/...`). One URL per (classification, weight_class) (e.g. 1A 106, 2A 113).
- Copy as-is; bracket images will keep working from the same URLs unless you host them elsewhere.

### 2.4 Logic notes

- **Placers:** For `year >= 2026` the page treats placers as place 1–4; for older years, 1–6 (or 1–8 in some logic). The [year] page groups by classification and weight and shows placers; 2026 uses 7 divisions (1A/2A, 3A–8A).
- **Classification order:** `CLASSIFICATION_ORDER = ["1-4A", "1A/2A", "1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A"]`.

### 2.5 Fixes in RecruitNC

1. **Supabase:** Replace `createClient` from `@/lib/supabase/client` with RecruitNC's browser client.
2. **Paths:** Ensure `@/components/tournament-bracket-modal` and UI components resolve.
3. **Links:** "Back to NCHSAA" → `/nchsaa`; keep year in URL as-is.

### 2.6 Checklist — Year results

- [ ] Copy `app/nchsaa/[year]/page.tsx`, `app/nchsaa/[year]/loading.tsx`, and `components/tournament-bracket-modal.tsx`.
- [ ] Point Supabase to RecruitNC client in the year page.
- [ ] Add nav: **2026 Results** → `/nchsaa/2026`, **2025 Results** → `/nchsaa/2025`.

---

## Phase 3: Digital Archive (`/nchsaa/archive`)

### 3.1 Files to copy

| Source (Legacy NC)              | Destination (RecruitNC)             |
|---------------------------------|-------------------------------------|
| `app/nchsaa/archive/page.tsx`   | `app/nchsaa/archive/page.tsx`       |
| `app/nchsaa/archive/loading.tsx`| `app/nchsaa/archive/loading.tsx`    |
| `components/state-champions-tabs.tsx` | `components/state-champions-tabs.tsx` |

### 3.2 Supabase (client only)

**Archive page:**

| Table                     | Query | Purpose |
|---------------------------|--------|---------|
| `wrestling_nchsaa_results`| Paginated: `select("*").gte("place",1).lte("place",6).order("year",{asc:false}).order("classification").order("weight_class").order("place").range(offset, offset+999)` in a loop until no more rows. | All state placers (place 1–6) for archive search/filter. |
| `most_outstanding_wrestlers` | `select("*").order("year", { ascending: false })` | MOW list for archive. |

**StateChampionsTabs:**

| Table                     | Query | Purpose |
|---------------------------|--------|---------|
| `wrestling_nchsaa_results`| `select("wrestler_name, year, classification, weight_class, school, place").eq("place", 1).not("school", "is", null).neq("school","").not("school","ilike","unknown").not("wrestler_name","is",null).neq("wrestler_name","").order("year",{asc:false}).limit(100000)` | All state champs (place=1); grouped client-side into 2x, 3x, 4x champions. |

### 3.3 StateChampionsTabs client fix

- In Legacy it has `import { createClient } from "@/lib/supabase/server"` but **actually** uses `const { supabase } = await import("@/lib/supabase")` inside `useEffect` (browser). So it's client-side.
- In RecruitNC: remove the unused server import and replace the dynamic import with RecruitNC's **browser** client (e.g. `createClient` from `@/lib/supabase/client` used in a `useEffect`).

### 3.4 Archive page client

- Archive page uses `const { supabase } = await import("@/lib/supabase")` for its fetch. Replace with RecruitNC's browser client.

### 3.5 Dependencies (archive)

- **UI:** Card, Badge, Button, Input, Select, Tabs from `@/components/ui/`.
- **Icons:** Archive, Filter, School, Search, Trophy, Star.
- **Next:** Image.
- **Component:** StateChampionsTabs.

### 3.6 Fixes in RecruitNC

1. **Archive page:** Replace `import("@/lib/supabase")` with RecruitNC's browser client (same pattern as other client pages).
2. **StateChampionsTabs:** Use RecruitNC's browser client for the champions query; remove unused server import.
3. **Paths:** Ensure `@/components/state-champions-tabs` and UI resolve.

### 3.7 Checklist — Archive

- [ ] Copy `app/nchsaa/archive/page.tsx`, `app/nchsaa/archive/loading.tsx`, and `components/state-champions-tabs.tsx`.
- [ ] Point Supabase to RecruitNC client in both the archive page and StateChampionsTabs.
- [ ] Add nav: **Digital Archive** → `/nchsaa/archive`.
- [ ] Smoke test: search/filter and StateChampionsTabs (2x/3x/4x state champs).

---

## 4. RecruitNC nav (STATES section)

After migrating, add a **STATES** (or "NCHSAA") section to RecruitNC's navbar:

- **Tournament Overview** → `/nchsaa`
- **2026 Results** → `/nchsaa/2026`
- **2025 Results** → `/nchsaa/2025`
- **Digital Archive** → `/nchsaa/archive`

You can mirror labels and descriptions from Legacy NC's `components/wrestling-navbar.tsx` (navigationItems → STATES).

---

## 5. Table summary (for RLS)

Ensure the **browser** role can **select** from:

- `wrestling_nchsaa_results`
- `most_outstanding_wrestlers`
- `tournament_champions`

No writes; no API routes.

---

## 6. Optional / not in scope

- **`app/nchsaa/validate/page.tsx`** — Diagnostics/validation page (calls `/api/diagnostics/nchsaa-sanity` and `nchsaa-matrix`). Not part of the main STATES menu; skip unless you want to migrate admin/diagnostics.

---

## 7. Quick file checklist

| Phase | Files |
|-------|--------|
| 1 Overview | `app/nchsaa/page.tsx`, `lib/regional-data.ts` |
| 2 Year     | `app/nchsaa/[year]/page.tsx`, `app/nchsaa/[year]/loading.tsx`, `components/tournament-bracket-modal.tsx` |
| 3 Archive  | `app/nchsaa/archive/page.tsx`, `app/nchsaa/archive/loading.tsx`, `components/state-champions-tabs.tsx` |

All Supabase usage: RecruitNC **browser** client. Auth: replace or remove **AuthGuard** on the overview page only (year and archive pages don't use AuthGuard in Legacy).
