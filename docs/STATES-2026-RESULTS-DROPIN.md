# STATES 2026 Results — Drop-in bundle for RecruitNC

Copy these files into your RecruitNC app to add **NCHSAA year results** (`/nchsaa/2026`, `/nchsaa/2025`, etc.).

## Copy

| From this bundle | To RecruitNC |
|------------------|--------------|
| `app/nchsaa/[year]/page.tsx` | `app/nchsaa/[year]/page.tsx` |
| `app/nchsaa/[year]/loading.tsx` | `app/nchsaa/[year]/loading.tsx` |
| `components/tournament-bracket-modal.tsx` | `components/tournament-bracket-modal.tsx` |

## One change in RecruitNC

In **`app/nchsaa/[year]/page.tsx`**, ensure the Supabase client is your app’s **browser** client:

- If RecruitNC uses the **same** Supabase project and has `createClient` at `@/lib/supabase/client`, leave the import as-is.
- Otherwise replace:  
  `import { createClient } from "@/lib/supabase/client"`  
  with your RecruitNC browser client (e.g. your app’s `@/lib/supabase/client` or equivalent).

**Current RecruitNC setup:** The year page uses `import { supabase } from "@/lib/supabase"`, which is the app’s browser client (`createBrowserClient` from `@/lib/supabase`). No change needed.

## Supabase tables (read-only)

- `wrestling_nchsaa_results` (filter by `year`)
- `most_outstanding_wrestlers` (filter by `year`)
- `tournament_champions` (filter by `year`)

RLS must allow **select** for the role used by the browser client.

## UI dependencies

RecruitNC must have (or you must add):

- `@/components/ui/card`
- `@/components/ui/button`
- `@/components/ui/badge`
- `@/components/ui/tabs`
- `@/components/ui/select`
- `@/components/ui/dialog` (for the bracket modal)

Bracket images are loaded from Vercel Blob URLs (no change needed).

## Nav

Add **2026 Results** → `/nchsaa/2026` and **2025 Results** → `/nchsaa/2025` to your STATES menu.

**Current RecruitNC setup:** The navbar STATES dropdown already includes Tournament Overview, 2026 Results, 2025 Results, and Digital Archive.
