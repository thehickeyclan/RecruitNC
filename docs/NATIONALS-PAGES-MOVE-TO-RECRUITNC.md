# Nationals Pages — Copy to RecruitNC

**Source repo:** Legacy NC (this repo)  
**Target repo:** RecruitNC  
**Database:** Same Supabase project (no schema or data migration).

This doc describes copying the **NATIONALS** section from Legacy NC to RecruitNC. Start with **Tournament Overview**, then add 2025 Results, Digital Archive, and Super32 Champions.

---

## NATIONALS dropdown (Legacy NC)

| Nav label           | Route        | Description                          |
|---------------------|--------------|--------------------------------------|
| Tournament Overview | `/nhsca`     | About NHSCA Nationals & divisions    |
| 2025 Results        | `/nhsca/2025`| Current year results & All-Americans |
| Digital Archive     | `/nhsca/archive` | Complete history 1990–2025        |
| Super32 Champions   | `/super32`   | All-time Super32 Champions from NC   |

---

## Phase 1: Tournament Overview only

Copy the **Tournament Overview** page first: `/nhsca` (NHSCA Nationals overview, countdown, division tabs, links to 2025 Results and Archive).

### 1.1 Files to copy (Legacy NC → RecruitNC)

| Type     | Source (Legacy NC)              | Destination (RecruitNC)           |
|----------|----------------------------------|-----------------------------------|
| Page     | `app/nhsca/page.tsx`            | `app/nhsca/page.tsx`              |
| Loading  | `app/nhsca/loading.tsx`         | `app/nhsca/loading.tsx`           |
| Component| `components/nhsca-countdown.tsx`| `components/nhsca-countdown.tsx`  |
| Component| `components/nhsca-division-stats.tsx` | `components/nhsca-division-stats.tsx` |

### 1.2 Dependencies (RecruitNC must have)

- **UI:** `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `Button`, `Badge`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` (e.g. from `@/components/ui/`).
- **Icons:** `lucide-react` (Trophy, Calendar, Users, Target, Star, TrendingUp, Search, ExternalLink).
- **Next:** `Link`, `Image` from `next/link` and `next/image`.
- **Auth (optional):** Tournament Overview in Legacy uses `<AuthGuard requireAuth>`. In RecruitNC you can:
  - Keep a similar guard (e.g. require login to see Nationals), or
  - Remove `AuthGuard` and render the page publicly.

### 1.3 Import and path fixes in RecruitNC

After copying into RecruitNC:

1. **Auth**
   - If RecruitNC uses a different auth wrapper, replace:
     - `import { AuthGuard } from "@/components/auth-guard"`  
     - and `<AuthGuard requireAuth>…</AuthGuard>`  
     with your app’s guard or remove for public access.

2. **Components**
   - Ensure `@/components/ui/*` and `@/components/nhsca-countdown`, `@/components/nhsca-division-stats` resolve (adjust paths if RecruitNC uses a different structure).

3. **NHSCADivisionStats**
   - In Legacy NC, `nhsca-division-stats.tsx` may be minimal or empty. If the copied file is empty, either:
     - Add a simple placeholder (e.g. “Division stats” or a link to 2025 Results), or
     - Omit the component and remove the four `<NHSCADivisionStats division="…" />` usages from `app/nhsca/page.tsx`.

### 1.4 Assets

- **Image:** `public/images/nhsca-logo.png`  
  - Copy from Legacy NC `public/images/nhsca-logo.png` into RecruitNC `public/images/` so `/images/nhsca-logo.png` works.

### 1.5 Database / API

- **Tournament Overview page does not call the database or any API.**  
  It is static content plus:
  - `NHSCACountdown` (client-side date math),
  - `NHSCADivisionStats` (if implemented, would query NHSCA data; in Legacy it can be a no-op).
- So for Phase 1, **no Supabase or API changes** are required in RecruitNC.

### 1.6 Internal links on the page

- “2025 Results” → `/nhsca/2025`  
- “Browse Archive” → `/nhsca/archive`  

These will 404 in RecruitNC until you add those routes in a later phase. You can leave the links as-is or point them to Legacy NC for now (e.g. `https://legacy.ncwrestlingunited.com/nhsca/2025`).

### 1.7 Nav in RecruitNC

Add a **NATIONALS** dropdown (or single link) with at least:

- **Tournament Overview** → `/nhsca` (About NHSCA Nationals & divisions).

Example structure (adapt to your navbar):

```tsx
{
  title: "Tournament Overview",
  href: "/nhsca",
  description: "About NHSCA Nationals & divisions",
}
```

### 1.8 Checklist — Tournament Overview

- [ ] Copy `app/nhsca/page.tsx` and `app/nhsca/loading.tsx` to RecruitNC.
- [ ] Copy `components/nhsca-countdown.tsx` and `components/nhsca-division-stats.tsx`.
- [ ] Fix imports (AuthGuard, UI, component paths).
- [ ] Handle or remove AuthGuard; implement or stub NHSCADivisionStats.
- [ ] Copy `public/images/nhsca-logo.png`.
- [ ] Add nav entry for Tournament Overview → `/nhsca`.
- [ ] Verify `/nhsca` loads and countdown/links look correct.

---

## Later phases (short reference)

- **Phase 2 — 2025 Results** (`/nhsca/2025`): Copy `app/nhsca/2025/`, `NHSCAChampionsTabs`, `NHSCAPerformanceCharts`; pages use **client Supabase** (`wrestling_nhsca_results`). Same DB, so use RecruitNC’s Supabase client.
- **Phase 3 — Digital Archive** (`/nhsca/archive`): Copy `app/nhsca/archive/`; page uses client Supabase (`wrestling_nhsca_results`, `most_outstanding_wrestlers`).
- **Phase 4 — Super32 Champions** (`/super32`): Copy `app/super32/page.tsx` and `app/api/super32/champions/route.ts`; replace `getSupabaseAdmin()` with RecruitNC’s admin client in the API route.

Full file lists and API details for phases 2–4 can be added to this doc once Phase 1 is done.
