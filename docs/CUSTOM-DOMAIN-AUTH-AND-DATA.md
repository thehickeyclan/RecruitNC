# Custom domain: sign-in loops and missing admin data

When the app is opened via the custom domain (e.g. `https://app.ncwrestlingunited.com`) instead of the Vercel URL, you may see:

- **Sign-in keeps refreshing** (only works in incognito)
- **Admin pages show no data** (e.g. Blue member cockpit shows "No signups yet", 0 Active/Paused/Canceled)

Both usually come from **auth and config being tied to the Vercel URL** instead of the custom domain.

---

## 1. Sign-in loops / “only works in incognito”

**Cause:** Supabase and/or the app think the “home” URL is the Vercel domain. Magic links and OAuth redirect back to Vercel; cookies are set there. When you then open the **custom domain**, the browser doesn’t send those cookies (different origin), so you look logged out and get sent back to sign-in → loop. Incognito works once because you sign in on the domain you’re actually using and cookies are set for that domain.

**Fix:**

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
   - **Site URL:** set to your custom domain, e.g. `https://app.ncwrestlingunited.com`
   - **Redirect URLs:** add:
     - `https://app.ncwrestlingunited.com/**`
     - `https://app.ncwrestlingunited.com/auth/callback`
   - (Keep any Vercel URLs you use for previews if you want.)

2. **Vercel** (project that serves the custom domain)
   - **Settings** → **Environment Variables**
   - For **Production** (and any env that serves the custom domain), set:
     - `NEXT_PUBLIC_SITE_URL` = `https://app.ncwrestlingunited.com`
   - Redeploy so the new value is used.

3. **Clear cookies on the custom domain**
   - In a normal (non‑incognito) window, open the custom domain, then clear site data/cookies for `app.ncwrestlingunited.com`, or use an incognito window and sign in once on the custom domain so cookies are set there.

After this, sign-in and callback should stay on the custom domain and cookies will be for that origin, so the loop should stop.

---

## 2. No Blue (or other admin) data on custom domain

**Cause:** Either the session cookie isn’t sent to the API on the custom domain, or the deployment that serves the custom domain uses a **different Supabase project** (different env vars), so it’s reading from a different DB that has no Blue data.

**Fix:**

1. **Same Supabase as Vercel**
   - The deployment that serves `app.ncwrestlingunited.com` must use the **same** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as the deployment where Blue data appears (e.g. the Vercel URL).
   - In Vercel, the custom domain is usually tied to **Production**. So Production env vars must point to the same Supabase project as the one where you see Blue data on the Vercel URL.

2. **Cookies**
   - After fixing Section 1, sign-in on the custom domain sets cookies for that domain, so `/api/admin/blue/subscriptions` and other admin APIs on the same domain will receive the session and return data.

3. **Quick check**
   - Open `https://app.ncwrestlingunited.com/debug/auth-urls` and confirm “Detected origin” and “NEXT_PUBLIC_SITE_URL” are the custom domain.
   - Sign in on the custom domain, then open a request that requires auth (e.g. Blue subscriptions). If you still see no data, compare Production env vars (Supabase URL/keys) with the deployment where data does show.

---

## 3. Checklist summary

| Where | What to do |
|-------|------------|
| **Supabase** | Site URL = custom domain; Redirect URLs include `https://app.ncwrestlingunited.com/**` and `.../auth/callback`. |
| **Vercel (Production)** | `NEXT_PUBLIC_SITE_URL` = `https://app.ncwrestlingunited.com`. Same Supabase env vars as the deployment that has Blue data. |
| **Browser** | Clear cookies for the custom domain once, then sign in again on the custom domain (or use a fresh incognito window and sign in there). |

After these, sign-in and admin data should work on the custom domain the same as on the Vercel URL.
