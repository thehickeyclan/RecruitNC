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

## Phase 2: 2025 Results (`/nhsca/2025`)

Copy the **2025 Results** page: current-year NHSCA All-Americans, performance stats, national comparison, college commitments, and multi-time champions/All-Americans tabs.

### 2.1 Files to copy (Legacy NC → RecruitNC)

| Type       | Source (Legacy NC)                     | Destination (RecruitNC)                |
|------------|----------------------------------------|----------------------------------------|
| Page       | `app/nhsca/2025/page.tsx`             | `app/nhsca/2025/page.tsx`              |
| Loading    | `app/nhsca/2025/loading.tsx`           | `app/nhsca/2025/loading.tsx`           |
| Component  | `components/nhsca-performance-charts.tsx` | `components/nhsca-performance-charts.tsx` |
| Component  | `components/nhsca-champions-tabs.tsx`  | `components/nhsca-champions-tabs.tsx`  |

**No API routes** are used by the 2025 page; all data is fetched **client-side** via Supabase.

### 2.2 Supabase (same DB)

The page and components use the **browser Supabase client** (not admin, not API routes). Same project as Legacy NC.

| Table                    | Usage |
|--------------------------|--------|
| `wrestling_nhsca_results`| 2025 All-Americans (year=2025, placement 1–8); also used by `NHSCAChampionsTabs` for all years (placement 1–8, limit 100k). |
| `athletes`               | College commitments: `id, name, firstName, lastName, college, collegeLogoUrl, recruiting_status` where `recruiting_status` in (`Committed`, `College Athlete`, `committed`, `college athlete`) and `college` not null. |

**In RecruitNC:** Use RecruitNC’s existing **client-side Supabase** (e.g. from `@/lib/supabase` or your browser client). Replace any `import("@/lib/supabase")` / `supabase` usage so it points to RecruitNC’s client; no schema or RLS changes required if the same project is used.

### 2.3 Data flow in Legacy NC

- **`app/nhsca/2025/page.tsx`**
  - `const { supabase: supabaseClient } = await import("@/lib/supabase")`
  - **Query 1:** `wrestling_nhsca_results` — `year=2025`, `placement` 1–8, order by division, weight, placement.
  - **Query 2:** `athletes` — college commitments (fields above).
- **`components/nhsca-champions-tabs.tsx`**
  - `const { supabase } = await import("@/lib/supabase")`
  - **Query:** `wrestling_nhsca_results` — placement 1–8, all years, limit 100000; then groups in JS into 2x/3x/4x champions and All-Americans.

### 2.4 Import and path fixes in RecruitNC

1. **Supabase client**
   - Replace `import("@/lib/supabase")` (and use of `supabase` / `supabaseClient`) with RecruitNC’s client. For example, if RecruitNC uses `createBrowserClient` from `@/lib/supabase/client` or a similar module, use that so both the 2025 page and `NHSCAChampionsTabs` read from the same DB.

2. **UI and components**
   - Ensure `@/components/ui/*` (Card, Button, Badge, Input, Select, Tabs) and `@/components/nhsca-performance-charts`, `@/components/nhsca-champions-tabs` resolve. Adjust paths if your app structure differs.

3. **Assets**
   - The 2025 page uses `src="/nc-united-logo.png"`. Copy `public/nc-united-logo.png` from Legacy NC to RecruitNC `public/`, or point the `Image` to your own logo path.

4. **Auth**
   - The 2025 page in Legacy NC has **no** `AuthGuard`; it’s public. You can keep it public in RecruitNC or wrap it in your auth if desired.

### 2.5 Static data on the page

The following are **hardcoded** in the 2025 page (no DB). Update or leave as-is for RecruitNC:

- **`MULTI_TIME_AAS`** — Multi-time All-Americans (names, times, years).
- **`STATE_DATA_2025`** — State comparison (All-Americans by state/division) for the National Comparison chart/table/summary.
- **`DIVISION_STANDINGS`** — NC division standings (rank, All-American counts, highlights).

`NHSCAPerformanceCharts` uses **static** `clubData` and `schoolData` (no API). The main page also derives **top clubs** and **top schools** from the loaded `wrestlers` (from DB); the charts component does not use that — it’s independent. You can later replace the static data in `NHSCAPerformanceCharts` with props from the page if you want charts to reflect live data.

### 2.6 Internal links

- “Back to NHSCA” → `/nhsca` (Tournament Overview). Requires Phase 1.

### 2.7 Nav in RecruitNC

Add to the NATIONALS section:

- **2025 Results** → `/nhsca/2025`.

*(Already present in RecruitNC navbar: Nationals dropdown includes “2025 Results” → `/nhsca/2025`.)*

### 2.8 Checklist — 2025 Results

- [ ] Copy `app/nhsca/2025/page.tsx` and `app/nhsca/2025/loading.tsx`.
- [ ] Copy `components/nhsca-performance-charts.tsx` and `components/nhsca-champions-tabs.tsx`.
- [ ] Point Supabase usage to RecruitNC’s client in the page and in `NHSCAChampionsTabs`.
- [ ] Verify `wrestling_nhsca_results` and `athletes` are accessible (same project; check RLS if RecruitNC uses different policies).
- [ ] Copy or replace `public/nc-united-logo.png`.
- [ ] Add nav entry “2025 Results” → `/nhsca/2025` (already done).
- [ ] Optionally refresh static data (multi-time AAs, state comparison, division standings) for future years.

---

## Phase 3: Digital Archive (`/nhsca/archive`)

Copy the **Digital Archive** page: full NHSCA history (1990–2025), charts, search/filters, year-by-year view, and Most Outstanding Wrestler (MOW) badges.

### 3.1 Files to copy (Legacy NC → RecruitNC)

| Type   | Source (Legacy NC)           | Destination (RecruitNC)       |
|--------|------------------------------|--------------------------------|
| Page   | `app/nhsca/archive/page.tsx` | `app/nhsca/archive/page.tsx`   |
| Loading| `app/nhsca/archive/loading.tsx` | `app/nhsca/archive/loading.tsx` |
| UI     | `components/ui/chart.tsx`    | `components/ui/chart.tsx`      |

**No API routes.** All data is fetched **client-side** via Supabase. No separate NHSCA components; the archive is a single page.

### 3.2 Supabase (same DB)

Uses the **browser Supabase client** only.

| Table                      | Usage |
|----------------------------|--------|
| `wrestling_nhsca_results`  | All All-Americans: `placement` 1–8, all years, order by year desc, division, weight, placement. Page aggregates in JS for charts and year stats. |
| `most_outstanding_wrestlers` | All rows, order by year desc. Used to show MOW badge next to wrestlers who match `name` + `year`. |

**In RecruitNC:** Use RecruitNC’s **client-side Supabase**. Replace `import("@/lib/supabase")` with your app’s client. Same project = no schema/RLS change if already set for Phase 2.

### 3.3 Data flow in Legacy NC

- **`app/nhsca/archive/page.tsx`**
  - `const { supabase } = await import("@/lib/supabase")`
  - **Query 1:** `wrestling_nhsca_results` — `placement` 1–8, order year desc, division, weight, placement (no limit; full history).
  - **Query 2:** `most_outstanding_wrestlers` — `select("*")`, order year desc.
  - Client-side: aggregates by year for chart data and year stats; filters for search (wrestler name/club, high school, year, division, weight).

### 3.4 Dependencies (RecruitNC must have)

- **UI:** `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `Badge`, `Button`, `Input`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` from `@/components/ui/`.
- **Charts:** `components/ui/chart.tsx` exporting `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` (Recharts wrapper). Plus **recharts**: `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `ResponsiveContainer`, `Legend`.
- **Icons:** `lucide-react` — Archive, BarChart3, Filter, LineChartIcon, Search, Star, Table, TrendingUp.
- **Next:** `Link`, `Image` from `next/link`, `next/image`.

### 3.5 Import and path fixes in RecruitNC

1. **Supabase**
   - Replace `import("@/lib/supabase")` and use of `supabase` with RecruitNC’s browser client (same as Phase 2).

2. **Chart**
   - Ensure `@/components/ui/chart` exists. If RecruitNC uses a different chart lib, you’ll need to adapt the chart section (Recharts `LineChart` + `ChartContainer`/`ChartTooltipContent`) to your setup or copy Legacy’s `components/ui/chart.tsx`.

3. **Assets**
   - Copy `public/images/nhsca-logo.png` (same as Phase 1) if not already present.

4. **Auth**
   - Archive page has **no** `AuthGuard` in Legacy; it’s public. Keep public or add your auth as needed.

### 3.6 Internal links on the page

- “2025 Results” → `/nhsca/2025` (Phase 2).
- “Back to NHSCA” → `/nhsca` (Phase 1).

### 3.7 Nav in RecruitNC

Add to NATIONALS:

- **Digital Archive** → `/nhsca/archive`.

*(Already present in RecruitNC navbar: Nationals dropdown includes “Digital Archive” → `/nhsca/archive`.)*

### 3.8 Checklist — Digital Archive

- [ ] Copy `app/nhsca/archive/page.tsx` and `app/nhsca/archive/loading.tsx`.
- [ ] Copy or implement `components/ui/chart.tsx` (ChartContainer, ChartTooltip, ChartTooltipContent).
- [ ] Ensure **recharts** is installed (`recharts`) — RecruitNC has it.
- [ ] Point Supabase usage to RecruitNC’s client.
- [ ] Verify `wrestling_nhsca_results` and `most_outstanding_wrestlers` are readable (same project; RLS if applicable).
- [ ] Copy `public/images/nhsca-logo.png` if needed.
- [ ] Add nav entry “Digital Archive” → `/nhsca/archive` (already done).
- [ ] Test search, filters, chart/table/trends views, and MOW badges.

---

## Later phases (short reference)

- **Phase 4 — Super32 Champions** (`/super32`): Copy `app/super32/page.tsx` and `app/api/super32/champions/route.ts`; replace `getSupabaseAdmin()` with RecruitNC’s admin client in the API route.
