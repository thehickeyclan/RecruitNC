# Schools Page — Apply These RecruitNC Fixes

After pasting the full Legacy NC Schools page code into `app/schools/page.tsx`, run these four fixes:

## 1. Supabase client (top of file)
- **Remove:** `import { createClient } from "@/lib/supabase/client"`, `const supabase = createClient()`, and the `getSupabase` helper.
- **Add:** `import { supabase } from "@/lib/supabase"`
- **In `loadLeaderboard`:** Remove the line `const supabase = getSupabase()` (use the imported `supabase` instead).

## 2. AuthGuard
- **Change:** `<AuthGuard requireAuth>` → `<AuthGuard>`
- RecruitNC's AuthGuard does not have a `requireAuth` prop; it already redirects unauthenticated users when used.

## 3. Logo image
- **Change:** `src="/nc-united-logo.png"` → `src="/images/nc-united-logo.png"`

## 4. Badge typo (Class of year)
- **Change:** `'{String(year).slice(-2)}` → `'${String(year).slice(-2)}` (add the `$` for the template literal so it shows e.g. '25).
