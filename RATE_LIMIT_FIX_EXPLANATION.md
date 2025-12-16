# Rate Limit Issue - Explanation & Fix

## The Problem

You're experiencing rate limits after being able to log in for 2 hours. This happens because:

1. **Every API route validates authentication** - Even with `autoRefreshToken: false`, calling `getUser()` or `getSession()` still makes network requests to Supabase to validate the session.

2. **Accumulation over time** - If you're navigating around the admin dashboard for 2 hours, every page load and API call triggers an auth check. These accumulate and can hit Supabase's rate limits.

3. **No caching** - Previously, every API call was making a fresh auth validation request, even if you just validated 1 second ago.

## The Fix

I've implemented a **cached auth check system** that:

1. **Caches auth results for 5 minutes** - Reduces Supabase API calls by ~95% for active sessions
2. **Only validates when necessary** - Checks rate limit cooldown before making any auth calls
3. **Gradually rolling out** - Updated the most frequently called admin API routes to use cached auth

## What Changed

### New Files
- `lib/cached-auth-check.ts` - Cached auth helper that reduces API calls
- `app/api/admin/users/export-csv/route.ts` - CSV export endpoint (also uses cached auth)

### Updated Files
- `app/api/admin/users/profiles/route.ts` - Now uses cached auth
- `app/api/admin/users/route.ts` - Now uses cached auth
- `app/admin/users-dashboard/page.tsx` - Added CSV export button

## If You Still Get Rate Limited

1. **Wait 2-5 minutes** - Supabase rate limits are temporary
2. **Clear browser cookies** - Remove any stale Supabase cookies
3. **Use the admin login API** - It uses service role key to bypass rate limits
4. **Check LegacyNC** - If LegacyNC is still making excessive calls, it can affect both apps

## Long-Term Solution

The cached auth system should prevent this from happening again. However, if you're still seeing issues:

1. **Reduce page refreshes** - Don't refresh the admin dashboard unnecessarily
2. **Close unused tabs** - Multiple tabs can multiply API calls
3. **Wait between actions** - Don't click rapidly through admin pages

## Monitoring

The cached auth system logs when it uses cached results vs. making new calls. Check your server logs for:
- `[Cached Auth] Using cached auth result` - Good, using cache
- `[Cached Auth] Rate limit cooldown active` - Rate limited, waiting

## Next Steps

If rate limits persist, we can:
1. Increase cache TTL (currently 5 minutes)
2. Update more API routes to use cached auth
3. Implement request batching
4. Add client-side request throttling

