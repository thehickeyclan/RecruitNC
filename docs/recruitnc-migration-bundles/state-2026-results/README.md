# STATES 2026 Results — Drop-in bundle for RecruitNC

Copy these files into your RecruitNC app to add **NCHSAA year results** (`/nchsaa/2026`, `/nchsaa/2025`, etc.).

## Copy instructions

1. **Copy the three file paths** from this bundle into your RecruitNC app (same paths under your app root):
   - `app/nchsaa/[year]/page.tsx` → your app’s `app/nchsaa/[year]/page.tsx`
   - `app/nchsaa/[year]/loading.tsx` → your app’s `app/nchsaa/[year]/loading.tsx`
   - `components/tournament-bracket-modal.tsx` → your app’s `components/tournament-bracket-modal.tsx`

2. **Supabase client**  
   In `app/nchsaa/[year]/page.tsx`, keep `import { supabase } from "@/lib/supabase"` if RecruitNC already uses that for the same Supabase project; otherwise switch to your app’s browser client (e.g. `import { createClient } from "@/lib/supabase/client"`).

3. **Database**  
   Ensure RLS allows `select` on:
   - `wrestling_nchsaa_results`
   - `most_outstanding_wrestlers`
   - `tournament_champions`

4. **Navigation**  
   Add nav links, e.g.:
   - 2026 Results → `/nchsaa/2026`
   - 2025 Results → `/nchsaa/2025`

## What’s in the bundle

- **`app/nchsaa/[year]/page.tsx`** — Year results page (2026, 2025, etc.) with summary, brackets selector, MOW, team points, and results by classification. Includes a comment to use RecruitNC’s Supabase client if needed.
- **`app/nchsaa/[year]/loading.tsx`** — Route loading UI (returns `null`).
- **`components/tournament-bracket-modal.tsx`** — Bracket viewer modal (Vercel Blob image URLs for 1A–4A; “Bracket image coming soon” for others).

## UI dependencies

The page and modal use:

- `@/components/ui/card`, `@/components/ui/button`, `@/components/ui/badge`
- `@/components/ui/tabs`, `@/components/ui/dialog`
- `@/components/ui/select`
- `lucide-react` (Crown, Calendar, Trophy, ArrowLeft, Download, Search, Eye, X)
- `next/link`, `next/image`

## Route behavior

The route is dynamic (`[year]`), so `/nchsaa/2026`, `/nchsaa/2025`, and other years work with the same code. Bracket images stay on the existing Vercel Blob URLs; no asset copy needed.
