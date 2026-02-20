# Profile debug: how to get root cause from logs

We added **targeted logs** so the next time you paste console (or Vercel logs) we can see exactly where it fails.

## What to do

1. **Deploy** this commit so the [profile-debug] logs are live.
2. **Reproduce**: go to prospects/all, click one athlete name or the profile link icon.
3. **Copy all console output** that contains `[profile-debug]` and paste it (plus any error that appears right after the click).
4. **If the profile page shows "Profile not found"**, open the same profile URL with **?debug=1** added, e.g.  
   `https://app.ncwrestlingunited.com/unified-profile/63ea613d-0886-4af0-b64b-1c3d80fe0332?debug=1`  
   The page will show the **raw API response** in a gray box. Screenshot that box or copy the text and share it.

## How to read the logs

- **You see `[profile-debug] Profile link clicked`** with `href` and `athleteId`  
  → The link is correct and the click fired. Next we need to see what happens after.

- **You do NOT see `[profile-debug] Profile page mount`** after the click  
  → Navigation to the profile page is failing (router or full-page load never happens). Root cause is before the profile page.

- **You see `[profile-debug] Profile page mount`** and **`[profile-debug] Fetching /api/athlete/...`**  
  → The profile page loaded and is calling the API. Next we need the response.

- **You see `[profile-debug] Response`** with `status`, `ok`, `bodyPreview`  
  → That tells us whether the API returned 200 + JSON or an error. If status is 500 or body is not JSON, the server-side logs (Vercel → Logs for the deployment) will have `[profile-debug] GET /api/athlete/[id]` with either "ok", "Supabase error", "no row", or "exception".

- **You see `[profile-debug] Fetch failed`**  
  → The request never completed (timeout, network, CORS, or request aborted). The message and name tell us which.

## Vercel server logs

In Vercel → your project → Logs (or the deployment’s function logs), filter or search for **`[profile-debug]`**. You should see one of:

- `GET /api/athlete/[id] received` then `ok` → API succeeded; if the client still shows "Profile not found", the bug is in the client.
- `GET /api/athlete/[id] Supabase error` with code/message → DB or RLS issue.
- `GET /api/athlete/[id] no row` → No athlete for that id.
- `GET /api/athlete/[id] exception` → createAdminClient() or something else threw (e.g. env).

Paste the **exact** [profile-debug] lines from console and (if you can) from Vercel logs so we can stop guessing and fix the real failure.
