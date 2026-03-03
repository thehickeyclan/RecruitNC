# Blue admin – env and “data loads 20% of the time”

## What was wrong

- **SUPABASE_SERVICE_ROLE_KEY_OVERRIDE** was used in `lib/supabase/admin.ts` before the main key. That “override” was added during a workaround period and caused:
  - Inconsistent behavior (different envs or caching).
  - Blue admin sometimes loading data, sometimes not.
- Admin APIs (subscriptions, interest forms, cockpit) all use **createAdminClient()**, which read that key. Two possible keys = two sources of truth = flaky.

## What we changed

- **Prefer one key.** `lib/supabase/admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY` first, then falls back to `SUPABASE_SERVICE_ROLE_KEY_OVERRIDE` so existing Vercel envs that only have OVERRIDE keep working. For a clean setup, set SUPABASE_SERVICE_ROLE_KEY and remove OVERRIDE.

## What you must do in Vercel

1. **Vercel → Project → Settings → Environment Variables**
2. Set **SUPABASE_SERVICE_ROLE_KEY** to your **service_role** key (Supabase Dashboard → Settings → API → `service_role` secret). Not the anon key.
3. Optionally remove SUPABASE_SERVICE_ROLE_KEY_OVERRIDE once SUPABASE_SERVICE_ROLE_KEY is set (cleaner; OVERRIDE is still a fallback if you need it).
4. **Redeploy** (Production and any Preview you use).

## Canceled requests ("---" in Network tab)

If document or API requests show as canceled (no status, 0 B transferred), Next.js was likely **prefetching** admin routes. When you navigate or when prefetches complete, the browser aborts some requests. Admin nav uses **`prefetch={false}`** on `Link` components (AdminHeader, Blue hub, Blue sub-pages) so each click is one navigation instead of many prefetches that get aborted. Do not remove `prefetch={false}` from admin/Blue links.

## If Blue admin still doesn’t load

- **401 Unauthorized:** Session not sent or expired. Sign in again; use “Sign in again” on the Blue subscriptions page if shown.
- **503 / “Supabase service role is not configured”:** SUPABASE_SERVICE_ROLE_KEY is missing or wrong for that environment. Set it and redeploy.
- **Table does not exist:** Run the SQL in the doc mentioned in the error (e.g. blue_memberships, blue_express_interest, blue_signups). See docs/blue-signups-table.md and Blue tables docs.

## One Supabase project

Use **one** Supabase project for the app. Auth and admin should point at the same project:

- **Auth (browser):** NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY  
- **Admin / server DB:** SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), **SUPABASE_SERVICE_ROLE_KEY** only  

See also docs/ROOT_CAUSE_PROFILE_FAILURE.md for URL/key consistency.
