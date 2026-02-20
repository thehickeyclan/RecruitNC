# Root cause: profile page failure (32h outage)

This doc explains **why** profiles broke, not workarounds. Fixes that only “move work to the client” or “use different links” address symptoms. The root causes below are what must be fixed or avoided so it doesn’t happen again.

---

## 1. Two Supabase configs, no single source of truth

The app reads Supabase from **two env paths**:

| Use | Env vars | Used by |
|-----|----------|--------|
| **Auth** (server + browser) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/server.ts`, `lib/supabase/client.ts`, middleware |
| **Admin / DB** | `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY_OVERRIDE` | `lib/supabase/admin.ts` → profile-check, athlete API, rankings, health |

**What went wrong:** After env changes (e.g. for Blue or another Supabase project), it’s possible:

- Auth (NEXT_PUBLIC_*) pointed at project A (or wrong/rate-limited).
- Admin used `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for project B.

Then: **auth calls (e.g. `getUser()` on the server) can hang or fail**, while **admin DB calls can still work** (or the opposite). The profile page used **both** on the server, so one bad path was enough to hang or break the request.

**Root cause:** No single source of truth. Auth and admin can resolve to different projects or keys. Any deploy/env change can create a mismatch.

**Fix:** One Supabase project for the app. In Vercel, set **one** URL and **one** service role key for that project. Prefer:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for **all** server-side DB and (if you ever need it) server auth.
- Use `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` **only** for the **same** project (browser auth). Add a startup or health check that compares `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` and fails or warns if they differ.

---

## 2. Server-side auth on a public page

The profile route **was** a server component that called:

- `createClient()` (server) → `getUser()` to get `currentUserId` for the “edit” UI.

**What went wrong:** Server-side `getUser()` uses cookies and talks to Supabase Auth. If auth env points at the wrong project, or the auth server is slow/rate-limited, **that call blocks the entire server response**. The HTML for `/unified-profile/[id]` is never sent, so the page “hangs” or times out.

**Root cause:** A **public** page (no login required) did **server-side auth** on every request. One slow or failing auth call blocks the whole page.

**Fix:** Do **not** call `createClient()` / `getUser()` on the server for `/unified-profile/[id]`. If you need “current user” for edit UI, load it in the **client** (e.g. from AuthContext or GET `/api/profile`) after the page has already rendered. The profile document request must **not** depend on auth.

---

## 3. Auth context POST → 405 on profile URL

Auth context was loading the logged-in user’s **profile** (user_profiles row) via a **server action** that issues a **POST** to the **current URL**. When the user is on `/unified-profile/abc-123`, that POST goes to `/unified-profile/abc-123`. That route only handles **GET**, so the server returns **405 Method Not Allowed**. The client then saw “Profile fetch exception” and the page could appear broken or blank.

**Root cause:** Using a server action that POSTs to the current location on a GET-only route. Design bug: the action’s transport is tied to the page URL.

**Fix:** Load the logged-in user profile via **GET `/api/profile`** (or another GET endpoint), not a server action that POSTs to the current URL. (This was already changed in auth-context.)

---

## 4. Too much server work in one request

The profile page (when server-rendered) did:

1. `getAthlete(id)`
2. Four parallel Supabase queries: NCHSAA, NHSCA, Super 32, Ultimate Club Duals.

**What went wrong:** Vercel serverless functions have a **time limit** (e.g. 10s). If the sum of DB + auth exceeds that, the function is killed and the response never arrives → “page hangs”. Adding timeouts (e.g. 8s) only makes the page fail **after** 8s instead of never; the root issue is **doing too much in a single server request** for a page that must be fast and reliable.

**Root cause:** The profile route was designed as a “do everything on the server” path. No bound on total work, so under load or slow DB it crosses the function timeout.

**Fix:** For the **initial** profile document (the HTML that unblocks the browser), do **minimal** server work: ideally **none** (return a shell and load data in the client from GET `/api/athlete/[id]`). Optional: add a separate API for “tournament data” and load it in the client after the athlete is shown, so no single request does all the work.

---

## Summary table

| # | Root cause | Symptom | Fix |
|---|------------|--------|-----|
| 1 | Two Supabase configs (auth vs admin), no single source of truth | Intermittent hangs, wrong data, or auth/DB mismatch after env change | One project; one URL/key set; verify SUPABASE_URL vs NEXT_PUBLIC_SUPABASE_URL |
| 2 | Server-side auth on public profile page | Page never returns if auth is slow or wrong | No createClient/getUser on server for `/unified-profile/[id]` |
| 3 | Auth context POST to current URL on GET-only route | 405, “Profile fetch exception” | Load user profile via GET `/api/profile`, not server action |
| 4 | Too much server work in one request | Timeout, page hangs | Minimal server work for profile document; load data client-side or via separate APIs |

---

## What to verify in Vercel right now

1. **One project:** `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` should be the **exact same** Supabase project URL (or leave `SUPABASE_URL` unset and use only `NEXT_PUBLIC_SUPABASE_URL` everywhere).
2. **One service key:** `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key for **that same** project (not anon, not a different project).
3. **Anon key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the **anon** key for the **same** project (needed for browser auth only).

After any env change, hit **GET /api/health** and confirm `ok: true` and that the same project is used for all profile/rankings APIs.
