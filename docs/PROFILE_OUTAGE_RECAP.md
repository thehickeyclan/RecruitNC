# Profile outage recap (~48 hours)

**For users:** What broke, what you saw, and what we fixed.  
**For the team:** Root causes and what we changed so it doesn’t happen again.

---

## What users experienced

- **Symptom:** Clicking an athlete name on Rankings or Prospects did nothing, or the profile URL never loaded (browser hung).
- **Duration:** Roughly 48 hours of effective outage for profile views.
- **Scope:** Any link to a wrestler’s profile (e.g. from Class of 2026/2027/2028 rankings or All Prospects). The rest of the app (rankings list, auth, Blue, etc.) kept working.

---

## What was actually broken

1. **Profile route never responded**  
   The app had a profile page at `/unified-profile/[id]`. When you opened that URL (or clicked a link to it), the **server never finished building the page**. In Vercel logs the request showed status `---` (no response). The browser waited until it gave up. So:
   - Links to profiles appeared to do nothing or “hang.”
   - No error page, no 404 — just no response.

2. **After we added a fix, production wasn’t on it**  
   We added a new profile route `/view-profile?id=...` that avoids the broken path. But production (app.ncwrestlingunited.com) was still serving an **older deployment** that didn’t include that route. So for a while:
   - New code had the fix; production did not.
   - Users still got 404 on `/view-profile` until the **new deploy** became the live production deploy.

So the outage had two phases: (1) profile page broken on the server, (2) fix deployed in code but not yet live on the domain.

---

## Why the original profile page broke (root causes)

Detailed write-up: **`docs/ROOT_CAUSE_PROFILE_FAILURE.md`**. Short version:

| # | Cause | What it meant |
|---|--------|----------------|
| 1 | **Two Supabase configs** | Auth used one URL/keys, admin/DB could use another. Env or project mismatch → auth or DB calls could hang or fail. |
| 2 | **Server-side auth on a public page** | The profile page ran `getUser()` on the server for every request. If that auth call hung (wrong project, rate limit, etc.), the **entire** page response was blocked. |
| 3 | **Auth context POST on a GET-only route** | Logged-in user profile was loaded via a server action that POSTed to the **current URL**. On `/unified-profile/[id]` that’s a GET-only route → 405 and “Profile fetch exception” on the client. |
| 4 | **Too much server work in one request** | Profile did multiple DB calls (athlete + NCHSAA, NHSCA, Super 32, etc.) plus auth in a single serverless request. Under load or slow DB, that could exceed Vercel’s timeout so the function was killed and no HTML was ever sent. |

So: one “slow” or failing auth or env issue was enough for the server to never return the profile page. Users saw a full outage for profile views.

---

## What we did to fix it

1. **New profile route: `/view-profile?id=<uuid>`**  
   - No dynamic segment in the path, so the server only serves a **static** route.  
   - The page is a **client component** that reads `?id=` and fetches athlete data from **GET `/api/athlete/[id]`**.  
   - No server-side auth and no heavy server work for the initial document. The browser gets HTML quickly; data loads in the client.

2. **All profile links point to the new route**  
   - Rankings table and card views now link to `/view-profile?id=<athlete.id>` (and `/create-profile` when there’s no valid id).  
   - So every “view profile” click uses the new, working path.

3. **Middleware**  
   - `/view-profile` is in the **public routes** list so we never run auth in middleware for that path.

4. **Supabase: single source of truth**  
   - `lib/supabase/admin.ts` uses one URL source and **warns** (does not throw) if `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` differ, so we can spot env drift.

5. **User profile load (auth context)**  
   - Already fixed: logged-in user profile is loaded via **GET `/api/profile`**, not a server action that POSTs to the current URL. So we don’t get 405 on profile pages.

6. **Confirming production had the fix**  
   - Production was still on an old commit (no `/view-profile`). We added a visible **“Deploy verified — you’re on the latest build”** bar on the rankings table. Once that bar appeared on https://app.ncwrestlingunited.com/public-rankings/2027, we knew production was on the new build and `/view-profile` was live. Profiles then worked for users.

---

## Current state

- **Profile URLs:** Use **https://app.ncwrestlingunited.com/view-profile?id=&lt;athlete-uuid&gt;** (links from rankings/prospects do this automatically).  
- **Old route:** `/unified-profile/[id]` still exists but was the one that hung; we don’t use it for links anymore.  
- **Deploy bar:** The green “Deploy verified” bar on the rankings table can be removed whenever you want; it was only to confirm production was on the new build.

---

## How to avoid this next time

1. **One Supabase project and one deploy**  
   Keep `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` and the service role / anon keys all pointing at the **same** project. After any env change, verify with GET `/api/health`.

2. **No server auth on public profile**  
   Don’t call `getUser()` (or similar) on the server for a page that must load without login. If you need “current user” for edit UI, load it in the client after the page has rendered.

3. **Minimal server work for the first paint**  
   For profile (and similar pages), keep the **document** request light: ideally a shell; load data in the client from GET APIs. Avoid one big server request that does auth + many DB calls.

4. **Confirm production deploy**  
   After a critical fix, ensure the **production** domain (e.g. app.ncwrestlingunited.com) is serving the deployment that contains the fix. Use a visible UI change or a known test URL to verify.

---

## References

- **Root cause (technical):** `docs/ROOT_CAUSE_PROFILE_FAILURE.md`  
- **Profile API:** `app/api/athlete/[id]/route.ts`  
- **New profile page:** `app/view-profile/page.tsx`  
- **Links:** `components/rankings-table-view.tsx`, `components/rankings-card-view.tsx` → `/view-profile?id=...`
