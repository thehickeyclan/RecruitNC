# Legacy NC → RecruitNC: Full Menu Migration

**Goal:** Migrate every item on the Legacy NC navbar to RecruitNC (same Supabase project).  
**Source:** Legacy NC (this repo). **Target:** RecruitNC.

This doc is the **master checklist** for the full menu. Existing phase docs cover NATIONALS and National Team in detail; this ties everything together and lists LEGACYNC, STATES, TOOLS, RTC, and HOME.

**Focus:** LEGACYNC section. NATIONALS is done (nhsca, super32). When ready, do STATES, TOOLS, RTC, then HOME as needed.

---

## Legacy NC menu (reference)

| Section    | Nav item                 | Route                          |
|-----------|---------------------------|--------------------------------|
| **HOME**  | HOME                      | `/`                            |
| **LEGACYNC** | Athletes              | `/athletes`                    |
|           | Schools                   | `/schools`                     |
|           | Dave Schultz Award        | `/dave-schultz-award`          |
|           | Tricia Saunders Award     | `/tricia-saunders-award`       |
| **NATIONALS** | Tournament Overview | `/nhsca`                       |
|           | 2025 Results              | `/nhsca/2025`                  |
|           | Digital Archive           | `/nhsca/archive`               |
|           | Super32 Champions         | `/super32`                     |
| **STATES** | Tournament Overview      | `/nchsaa`                      |
|           | 2026 Results              | `/nchsaa/2026`                 |
|           | 2025 Results              | `/nchsaa/2025`                 |
|           | Digital Archive           | `/nchsaa/archive`              |
| **TOOLS** | Tournament Calculator     | `/tools/tournament-calculator` |
|           | Tournament Best Practices | `/tournament-best-practices`   |
| **RTC**   | RTC                       | `/rtc`                         |

---

## Already documented (use these first)

| Area           | Doc | What it covers |
|----------------|-----|-----------------|
| **NATIONALS**  | `docs/NATIONALS-PAGES-MOVE-TO-RECRUITNC.md` | Phase 1: Tournament Overview. Phase 2: 2025 Results. Phase 3: Digital Archive. Phase 4: Super32 (short ref). Files, Supabase tables, checklists. |
| **National Team** | `docs/NATIONAL-TEAM-MOVE-TO-RECRUITNC.md` | NC United / National Team hub, UCD/NHSCA result pages, interest form, APIs. Migration complete in RecruitNC. |

---

## HOME (`/`)

- **Source:** `app/page.tsx`
- **Data:** No Supabase; uses `useAuth()`, `DataAccuracyForm`, `StoreProductPromotion`, links to athletes/login.
- **Copy to RecruitNC:** Copy `app/page.tsx`. Replace/wire `useAuth`, `DataAccuracyForm`, `StoreProductPromotion` to RecruitNC equivalents or remove. Update branding if needed (e.g. "LegacyNC" → your app name). Asset: `public/nc-united-logo.png`.

---

## LEGACYNC section

### Athletes (`/athletes`)

- **Source:** `app/athletes/page.tsx`; components: `DataAccuracyForm`, `AuthGuard`. Uses **client Supabase** (`createClient` from `@/lib/supabase/client`).
- **Data:** Queries many tables client-side: athletes, wrestling_nhsca_results, wrestling_nchsaa_results, super32 (or API), college commits, profiles, dave_schultz_award, tricia_saunders_award, most_outstanding_wrestlers, etc. Heavy aggregation in the page.
- **Copy to RecruitNC:** Copy page + `components/data-accuracy-form.tsx` (if you want that feature). Point Supabase to RecruitNC client. Replace `AuthGuard` with your auth or remove. Ensure RLS allows read on all tables you query. Libs: if athlete search uses `@/lib/school-normalization` or similar, copy those too.

### Schools (`/schools`)

- **Source:** `app/schools/page.tsx`; uses **client Supabase**, `AuthGuard`, `normalizeSchoolNameForSearch`, `createSchoolSearchPatterns` from `@/lib/school-normalization`.
- **Data:** wrestling_nchsaa_results, tournament_champions, athletes, NHSCA/Super32 aggregates, etc.
- **Copy to RecruitNC:** Copy page + `lib/school-normalization.ts` (or equivalent). Point Supabase to RecruitNC client. Replace AuthGuard. Same DB = same tables.

### Dave Schultz Award (`/dave-schultz-award`)

- **Source:** `app/dave-schultz-award/page.tsx`. **Client Supabase:** `dave_schultz_award`, `athletes` (id, name for profiles).
- **Copy to RecruitNC:** Copy page. Point Supabase to RecruitNC client. Tables: `dave_schultz_award`, `athletes`.

### Tricia Saunders Award (`/tricia-saunders-award`)

- **Source:** `app/tricia-saunders-award/page.tsx`. **Client Supabase:** `tricia_saunders_award` (or similar table name), `athletes` (id, name).
- **Copy to RecruitNC:** Copy page. Point Supabase to RecruitNC client. Same pattern as Dave Schultz.

---

## NATIONALS section

Fully specified in **`docs/NATIONALS-PAGES-MOVE-TO-RECRUITNC.md`**. Summary:

| Route            | Pages / components | Data |
|------------------|--------------------|------|
| `/nhsca`         | `app/nhsca/page.tsx`, loading, nhsca-countdown, nhsca-division-stats | None (static + countdown) |
| `/nhsca/2025`    | `app/nhsca/2025/page.tsx`, loading, nhsca-performance-charts, nhsca-champions-tabs | wrestling_nhsca_results, athletes |
| `/nhsca/archive` | `app/nhsca/archive/page.tsx`, loading, `components/ui/chart.tsx` | wrestling_nhsca_results, most_outstanding_wrestlers |
| `/super32`       | `app/super32/page.tsx` + **API** `app/api/super32/champions/route.ts` | API uses **admin** client; table(s) for Super32 champions |

---

## STATES section (NCHSAA)

### Tournament Overview (`/nchsaa`)

- **Source:** `app/nchsaa/page.tsx`. Uses `regionsData` from `@/lib/regional-data`, `AuthGuard`. **No Supabase** in the overview page itself (static content + classification data).
- **Copy to RecruitNC:** Copy `app/nchsaa/page.tsx` and `lib/regional-data.ts` (or inline the data). Replace AuthGuard. Links to `/nchsaa/2026`, `/nchsaa/2025`, `/nchsaa/archive`.

### 2026 Results / 2025 Results (`/nchsaa/2026`, `/nchsaa/2025`)

- **Source:** `app/nchsaa/[year]/page.tsx` (dynamic route). **Client Supabase:** `wrestling_nchsaa_results`, `most_outstanding_wrestlers`, `tournament_champions`. Component: `TournamentBracketModal`.
- **Copy to RecruitNC:** Copy `app/nchsaa/[year]/page.tsx` and `components/tournament-bracket-modal.tsx`. Point Supabase to RecruitNC client. Same DB = same tables. 2026 state qualifiers: `place = 0` for SQ; see `docs/2026-STATE-QUALIFIERS-FOR-RECRUITNC.md`.

### Digital Archive (`/nchsaa/archive`)

- **Source:** `app/nchsaa/archive/page.tsx`. Uses **client Supabase:** `wrestling_nchsaa_results`, `most_outstanding_wrestlers`. Component: `StateChampionsTabs` (which in Legacy uses **server** Supabase `createClient` from `@/lib/supabase/server` — in RecruitNC you can use client or server as long as it reads the same tables).
- **Copy to RecruitNC:** Copy page + `components/state-champions-tabs.tsx`. Point all Supabase usage to RecruitNC (client or server). Ensure `state-champions-tabs` uses a Supabase client that can read the NCHSAA/champions data you need.

---

## TOOLS section

### Tournament Calculator (`/tools/tournament-calculator`)

- **Source:** `app/tools/tournament-calculator/page.tsx`. **No Supabase or API** in the calculator (client-side math).
- **Copy to RecruitNC:** Copy the page. No data migration.

### Tournament Best Practices (`/tournament-best-practices`)

- **Source:** `app/tournament-best-practices/page.tsx`. **No Supabase or API** (static content).
- **Copy to RecruitNC:** Copy the page. No data migration.

---

## RTC (`/rtc`)

- **Source:** `app/rtc/page.tsx`. **No Supabase or API** in the RTC page (static/content).
- **Copy to RecruitNC:** Copy the page. Replace AuthGuard if present. No data migration.

---

## RecruitNC nav

After migrating pages, add each route to RecruitNC's navbar (or equivalent) so the menu matches. You can base the structure on `components/wrestling-navbar.tsx` in Legacy NC (navigationItems array) and map each `href` to the new routes.

---

## Shared dependencies (copy once)

- **UI:** Card, Button, Badge, Input, Select, Tabs, Table, etc. from `@/components/ui/`. RecruitNC likely has these; if not, copy from Legacy.
- **Auth:** Legacy uses `AuthGuard`, `useAuth` from `@/contexts/auth-context`. In RecruitNC use your auth; either wrap protected pages with your guard or make pages public.
- **Supabase:** Client-side: use RecruitNC's browser client everywhere instead of `import("@/lib/supabase")` or `createClient` from Legacy. Server/API: use RecruitNC's admin client (e.g. `createAdminClient()`) instead of `getSupabaseAdmin()`.
- **Assets:** `public/nc-united-logo.png`, `public/images/nhsca-logo.png` — copy as needed for each section.
- **Libs:** Copy when a page depends on them: `lib/school-normalization.ts`, `lib/regional-data.ts`, and any other libs referenced by the pages you copy.

---

## Order of work (suggested)

1. **NATIONALS** — Follow `NATIONALS-PAGES-MOVE-TO-RECRUITNC.md` (Phases 1–4).
2. **HOME** — Copy landing page and wire auth/branding.
3. **TOOLS + RTC** — No DB; copy Tournament Calculator, Best Practices, RTC pages.
4. **STATES** — NCHSAA overview, then `[year]` and archive (copy lib/regional-data, state-champions-tabs, tournament-bracket-modal).
5. **LEGACYNC** — Dave Schultz and Tricia Saunders (small); then Schools (lib/school-normalization); then Athletes (largest, many tables).

---

## Quick file checklist (by section)

| Section    | Files to copy (examples; see phase docs for full lists) |
|-----------|---------------------------------------------------------|
| HOME      | `app/page.tsx`                                          |
| LEGACYNC  | `app/athletes/page.tsx`, `app/schools/page.tsx`, `app/dave-schultz-award/page.tsx`, `app/tricia-saunders-award/page.tsx`; `components/data-accuracy-form.tsx`; `lib/school-normalization.ts` |
| NATIONALS | See `NATIONALS-PAGES-MOVE-TO-RECRUITNC.md` (nhsca/*, super32, chart, nhsca-countdown, nhsca-champions-tabs, nhsca-performance-charts, nhsca-division-stats, api/super32/champions) |
| STATES    | `app/nchsaa/page.tsx`, `app/nchsaa/[year]/page.tsx`, `app/nchsaa/archive/page.tsx`; `lib/regional-data.ts`; `components/state-champions-tabs.tsx`, `components/tournament-bracket-modal.tsx` |
| TOOLS     | `app/tools/tournament-calculator/page.tsx`, `app/tournament-best-practices/page.tsx` |
| RTC       | `app/rtc/page.tsx`                                     |

All Supabase usage: same project in RecruitNC; swap to RecruitNC's client/admin and your auth as above.

---

## RecruitNC current status

| Section    | Route(s) | Status in RecruitNC |
|-----------|----------|----------------------|
| HOME      | `/`      | Exists (`app/page.tsx`). |
| LEGACYNC  | `/athletes` | **Present** (`app/athletes/page.tsx`). |
|           | `/schools`  | **Present** — placeholder page; copy full list + `lib/school-normalization` from Legacy when ready. |
|           | `/dave-schultz-award`  | **Present** — reads `dave_schultz_award` + `athletes`; create table in Supabase if missing. |
|           | `/tricia-saunders-award` | **Present** — reads `tricia_saunders_award` + `athletes`; create table in Supabase if missing. |
| NATIONALS | `/nhsca`, `/nhsca/2025`, `/nhsca/archive`, `/super32` | **Done** (skip for migration). |
| STATES    | `/nchsaa`, `/nchsaa/2026`, `/nchsaa/2025`, `/nchsaa/archive` | **Missing** — no `app/nchsaa/*` in RecruitNC. |
| TOOLS     | `/tools/tournament-calculator`, `/tournament-best-practices` | **Missing** |
| RTC       | `/rtc`   | **Missing** |

**Nav:** RecruitNC navbar has a **Legacy NC** dropdown (desktop + mobile) with Athletes, Schools, Dave Schultz Award, Tricia Saunders Award.

**Next steps:** When ready, copy full Schools page + `lib/school-normalization` from Legacy NC. Then STATES, TOOLS, RTC. Use this doc + `NATIONALS-PAGES-MOVE-TO-RECRUITNC.md` and `NATIONAL-TEAM-MOVE-TO-RECRUITNC.md` for detail.
