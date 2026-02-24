# Schools Page Migration: Legacy NC → RecruitNC

Step-by-step migration plan for the **Schools** page under LEGACYNC.  
**Source:** Legacy NC. **Target:** RecruitNC (same Supabase project).

---

## Summary

| Item | Detail |
|------|--------|
| **Route** | `/schools` |
| **Source files** | `app/schools/page.tsx`, `lib/school-normalization.ts` |
| **Auth** | `AuthGuard` (RecruitNC: no `requireAuth` prop; guard already redirects when unauthenticated) |
| **Data** | Client read-only; all tables below |

---

## Files to copy

| Source (Legacy NC) | Target (RecruitNC) |
|--------------------|--------------------|
| `app/schools/page.tsx` | `app/schools/page.tsx` |
| `lib/school-normalization.ts` | `lib/school-normalization.ts` |

---

## Tables used (all client read)

| Table | Where it's used |
|-------|------------------|
| `tournament_champions` | Tournament Champions tab (leaderboard by `champion_school`) |
| `wrestling_nhsca_results` | Top Schools leaderboard + school search (`high_school`) |
| `super32_results` | Top Schools (`high_school` or `school`) |
| `wrestling_nchsaa_results` | Top Schools + school search (`school`) |
| `dual_team_champions` | Dual Team tab (`champion_school`; exclude `is_vacated`) |
| `athletes` | School search — commits; column `highschool` |
| `most_outstanding_wrestlers` | School search (`school`) |

**Optional:** RPC `normalize_school_name(input_name)` for canonical school name; if missing, client-side normalization in `lib/school-normalization.ts` is used.

**Optional cleanup:** Debug block that queries `wrestling_commits` for "Cardinal Gibbons" can be removed.

---

## Implementation steps

1. **Copy page + lib**  
   Copy `app/schools/page.tsx` and `lib/school-normalization.ts` from Legacy NC into RecruitNC.

2. **Point Supabase to RecruitNC's browser client**  
   Use `import { supabase } from "@/lib/supabase"` (or RecruitNC’s client). Remove `createClient` from `@/lib/supabase/client` and any `getSupabase()` helper; use the single `supabase` instance everywhere (e.g. in `loadLeaderboard`).

3. **Replace or remove AuthGuard `requireAuth`**  
   RecruitNC’s `AuthGuard` does not support `requireAuth`. Use `<AuthGuard>` only; the guard already redirects unauthenticated users when used.

4. **Confirm UI components and path**  
   Ensure all `@/components/ui/*` and `@/components/auth-guard` exist in RecruitNC. Ensure `@/lib/school-normalization` resolves to the copied `lib/school-normalization.ts`.

5. **Optional RPC; optional removal of debug block**  
   If `normalize_school_name(input_name)` exists in RecruitNC Supabase, the page can use it for canonical names; otherwise client-side normalization is used. Remove the Cardinal Gibbons / `wrestling_commits` debug block if desired.

6. **Confirm `athletes.highschool` for commits**  
   School search “Next Level” / commits use the `athletes` table. Confirm the column name in RecruitNC is `highschool` (or update the page to use your column).

7. **Add Schools → `/schools` to nav**  
   Under LEGACYNC, add a nav item “Schools” linking to `/schools`.

8. **Smoke test**  
   Test all tabs (Search Programs, Best of All-Time, Tournament Champions, Dual Team Champions) and school search (NHSCA, NCHSAA, Next Level / commits, MOW). Verify leaderboards and filters load and that logo path is correct (e.g. `/images/nc-united-logo.png` if that’s where the asset lives in RecruitNC).

---

## RecruitNC-specific fixes (after paste)

When the Legacy Schools page is first pasted into RecruitNC, apply:

- **Supabase:** `import { supabase } from "@/lib/supabase"`; remove `createClient` and `getSupabase`; in `loadLeaderboard` use the imported `supabase`.
- **AuthGuard:** `<AuthGuard>` only (no `requireAuth`).
- **Logo:** `src="/images/nc-united-logo.png"` (or RecruitNC’s public path).
- **Badge typo:** Class of year badge — use template literal `'${String(year).slice(-2)}` (not `'{String(year).slice(-2)}`).

See `docs/SCHOOLS-PAGE-RECRUITNC-FIXES.md` for the same checklist.
