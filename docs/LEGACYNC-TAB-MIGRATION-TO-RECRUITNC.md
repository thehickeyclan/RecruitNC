# LEGACYNC Tab Migration to RecruitNC

Phased migration for LEGACYNC navbar items into RecruitNC. Same Supabase project; swap client/auth and follow per-phase docs.

---

## Phases

| Phase | Item | Route | Doc / notes |
|-------|------|-------|-------------|
| 1 | Athletes | `/athletes` | Copy `app/athletes/page.tsx`; point Supabase to RecruitNC client; AuthGuard. |
| 2 | Dave Schultz / Tricia Saunders | `/dave-schultz-award`, `/tricia-saunders-award` | Copy pages; tables `dave_schultz_award`, `tricia_saunders_award`, `athletes`. |
| **3** | **Schools** | **`/schools`** | **Full plan: `docs/SCHOOLS-PAGE-MIGRATION-TO-RECRUITNC.md`** — copy page + `lib/school-normalization.ts`, tables (tournament_champions, wrestling_nhsca_results, super32_results, wrestling_nchsaa_results, dual_team_champions, athletes, most_outstanding_wrestlers), Supabase client, AuthGuard, nav, smoke test. |
| **4** | **STATES (NCHSAA)** | **`/nchsaa`, `/nchsaa/2026`, `/nchsaa/2025`, `/nchsaa/archive`** | **Full plan: `docs/STATES-PAGE-MIGRATION-TO-RECRUITNC.md`** — Phase 1: Overview + `lib/regional-data.ts`. Phase 2: [year] results + TournamentBracketModal. Phase 3: Archive + StateChampionsTabs. Browser Supabase only; RLS for wrestling_nchsaa_results, most_outstanding_wrestlers, tournament_champions. |
| 5 | TOOLS / RTC | `/tools/*`, `/rtc` | See `docs/LEGACY-NC-FULL-MENU-MIGRATION.md` for TOOLS, RTC. |

---

## Master checklist

Use **`docs/LEGACY-NC-FULL-MENU-MIGRATION.md`** for the full menu and file checklist.  
Use **`docs/SCHOOLS-PAGE-MIGRATION-TO-RECRUITNC.md`** for the full Schools migration (Phase 3).  
Use **`docs/STATES-PAGE-MIGRATION-TO-RECRUITNC.md`** for the full STATES (NCHSAA) migration (Phase 4).
