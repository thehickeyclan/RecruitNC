# National Team Pages — Move from Legacy NC to RecruitNC

**Source repo:** Legacy NC  
**Target repo:** RecruitNC (this repo)

For the Legacy NC side (what to copy, redirects, nav cleanup), see **Legacy NC** `docs/NATIONAL-TEAM-MOVE-TO-RECRUITNC.md`.

## Summary

**Scope:** Small–medium (~5 pages, ~5–6 API routes, 3 lib files, nav).  
**Risk:** Low (same DB, auth, blob).

## RecruitNC readiness (verified)

| Item | Status |
|------|--------|
| **Supabase admin client** | ✅ `createAdminClient()` in `lib/supabase/admin.ts` (service role). Same pattern as legacy `getSupabaseAdmin()`. |
| **Env** | ✅ Uses `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and `NEXT_PUBLIC_*` for client). Same DB = no new env. |
| **NC United / National Team data** | ✅ Same schema referenced in RecruitNC: `lib/tournament-tables.ts`, `scripts/nc-united-national-team-guide.md`, `api/run-script/add-national-team-columns`. Tables: `nc_united_tournaments`, `nc_united_wrestlers`, `nc_united_tournament_results`, `nc_united_matches`, `nc_united_dual_results`, `nc_united_gallery_images` (or `nc_united_images` — align name with legacy), `national_team_interest_forms`. |
| **Auth** | ✅ Same Supabase auth; national team pages are public. No new auth work. |
| **Blob / images** | ✅ Shared blob; image paths in DB or `/public/images/`. If same origin or same blob base URL, no change. |
| **Nav** | ✅ Add one item in `components/navbar.tsx`: e.g. `{ href: "/national-team", label: "National Team" }`. |
| **App routes** | ✅ NC United APIs + interest-form + hub + ucd-2024, ucd-2025, nhsca-2025, interest-form pages in RecruitNC. |

## Move progress (RecruitNC)

| Step | Status |
|------|--------|
| Lib (nc-united-api, nc-united-storage, nc-united-images) | ✅ In RecruitNC, no Supabase changes needed |
| API: nc-united/tournaments, results, duals, gallery, wrestlers | ✅ In RecruitNC, use `createAdminClient()` |
| API: national-team/interest-form (POST) | ✅ In RecruitNC |
| **Page: hub** `app/national-team/page.tsx` | ✅ In RecruitNC; nav link added |
| Pages: ucd-2024, ucd-2025, nhsca-2025, interest-form | ✅ In RecruitNC; `SiteFooter` → `Footer`; images in `public/images/` |
| Nav + optional admin | Nav done; optional admin after pages |

## Migration complete (including images)

- **Pages in RecruitNC:** hub (`/national-team`), `ucd-2024-results`, `ucd-2025-results`, `nhsca-2025-results`, `interest-form`. Imports fixed (`SiteFooter` → `Footer`).
- **APIs in RecruitNC:** `api/nc-united/tournaments`, `[id]/results`, `[id]/duals`, `[id]/gallery`, `wrestlers`; `api/national-team/interest-form`.
- **Images:** All paths used by the National Team pages are satisfied by files in `public/images/` (copied from Legacy NC or placeholder). Includes: NHSCA team/action photos, UCD team/gallery images, coach headshots, `nhsca-logo.png`, `wrestling-mat-texture.jpg` (placeholder). Optional fallbacks `ethan-oakley.png` / `ethan-oakley-coach.png` are not present; primary `EthanOakley.png` is.

To confirm images locally: run the app and open `/national-team`, then each results page and the interest form; no image 404s expected.

## UI, branding, desktop & mobile (post-migration check)

- **Layout:** All National Team pages use the root layout (Navbar + main + Footer). No duplicate nav/footer; back links go to `/national-team`.
- **Branding:** NC United colors used on National Team pages: navy `#002147`, red `#B31B1B`, gold `#CBAF5D` (aligned with Tailwind `nc-blue`, `nc-red`, `nc-gold` in `tailwind.config.ts`). Footer uses `bg-nc-blue`; `nc-blue` and `nc-red`/`nc-gold` DEFAULT were added so footer and other components resolve correctly.
- **Footer:** Quick Links updated to include **Blue Program** and **National Team** for discoverability.
- **Desktop:** Content uses `container mx-auto px-4`, `max-w-4xl` / `max-w-6xl` / `max-w-7xl` where appropriate. Grids use `md:grid-cols-*` and `lg:grid-cols-*` for cards and sections. Tables are full-width with clear headers.
- **Mobile:** Responsive typography (`text-4xl md:text-5xl`, `text-sm md:text-base`). Touch-friendly back buttons and CTAs. Result tables (UCD 2024, UCD 2025) use `overflow-x-auto` and `min-w-[600px]` so tables scroll horizontally on small screens; wrapper uses `-mx-4 px-4 md:mx-0 md:px-0` so scroll doesn’t feel cramped. Interest form uses `grid md:grid-cols-2` for fields and `md:grid-cols-3` for tournament cards; single column on mobile. No horizontal overflow from content; `overflow-x: hidden` and `max-width: 100vw` are set on body in `globals.css`.

## What to copy from Legacy NC

- **Pages:** `app/national-team/` (hub + interest-form + ucd-2024-results, ucd-2025-results, nhsca-2025-results).
- **APIs:** `api/nc-united/tournaments`, `results`, `duals`, `gallery`, `wrestlers`; `api/national-team/interest-form` (POST).
- **Lib:** `lib/nc-united-api.ts`, `lib/nc-united-storage.ts`, `lib/nc-united-images.ts`. These do **not** use Supabase (only `fetch()` to `/api/nc-united/...` and URL/path helpers). No changes needed when copying.
- **Admin (optional):** `admin/national-team-submissions` + `api/admin/national-team-submissions`.

## When copying API routes into RecruitNC

After pasting the route files from Legacy NC, apply these find/replace so they use RecruitNC’s admin client:

| File (under `app/api/`) | Replace |
|-------------------------|--------|
| `nc-united/tournaments/route.ts` | Import + call below |
| `nc-united/tournaments/[id]/results/route.ts` | Import + call below |
| `nc-united/tournaments/[id]/duals/route.ts` | Import + call below |
| `nc-united/tournaments/[id]/gallery/route.ts` | Import + call below |
| `nc-united/wrestlers/route.ts` | Import + call below |
| `national-team/interest-form/route.ts` | Import + call below |
| `admin/national-team-submissions/route.ts` (optional) | Import + call below |

**In each of the above route files:**

1. **Import:**  
   `import { getSupabaseAdmin } from "@/lib/server-supabase"`  
   →  
   `import { createAdminClient } from "@/lib/supabase/admin"`

2. **Call:**  
   `getSupabaseAdmin()`  
   →  
   `createAdminClient()`

A single find/replace across the copied route directory is enough: replace `getSupabaseAdmin` with `createAdminClient` and `@/lib/server-supabase` with `@/lib/supabase/admin` in the import line.

## Other import / path alignment

- Fix any `@/components` or `@/lib` path differences in the **pages** after copy (same UI stack = minimal changes).

## Hub page copy notes (when adding `app/national-team/page.tsx`)

- **Source:** `app/national-team/page.tsx` in Legacy NC.
- **Imports:** Uses `@/lib/nc-united-api` (`getTournaments`, `getTournamentResults`, type `Tournament`) — already in RecruitNC; `@/components/ui/button`, `card`, `badge`; `lucide-react`; `next/image`, `next/link`. Fix `@/components` paths if RecruitNC’s UI lives elsewhere.
- **Data:** Client-side only: `useEffect` → `getTournaments()` then `getTournamentResults(tournament.id)` per tournament. No Supabase in the page; all via the APIs already added.
- **Links:** Page uses `<Link href="/national-team/...">` for interest-form, ucd-2024-results, ucd-2025-results, nhsca-2025-results. Keep those paths so they work once those pages exist.
- **Check:** After copy, run the app and open `/national-team`. You should see the hub with tournament cards and stats (or empty state if no data).

## After the move

- **In RecruitNC:** Add National Team to `components/navbar.tsx`; no redirects needed here.
- **In Legacy NC:** Add redirects `/national-team` and `/national-team/*` → RecruitNC base URL; remove National Team entries from legacy nav (e.g. `components/wrestling-navbar.tsx`).

## Reference

- **Legacy NC checklist:** `docs/NATIONAL-TEAM-MOVE-TO-RECRUITNC.md` (in Legacy NC repo) — what to copy and post-move steps there.
- Legacy assessment (from LegacyNC chat): ~3,800 lines across 5 pages; 2–5 days for copy + import fixes + smoke test.
- RecruitNC NC United data guide: `scripts/nc-united-national-team-guide.md`.
