# Production deploy checklist (~5 min)

Use this right before or after you deploy.

## 1. Environment variables (Vercel / host)

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key  
- `STRIPE_SECRET_KEY` — Stripe secret key (`sk_live_...` or `sk_test_...`), **not** any other key (e.g. no `mk_`)  
- `STRIPE_BLUE_PRICE_ID` — Blue subscription price ID from Stripe  
- `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL` — Your production URL (e.g. `https://app.ncwrestlingunited.com`)

## 2. Supabase (Authentication → URL Configuration)

- **Site URL:** Your production origin, e.g. `https://app.ncwrestlingunited.com`  
- **Redirect URLs:** Include at least:
  - `https://app.ncwrestlingunited.com/**`
  - (If you use Vercel for this app) `https://v0-new-college-commits.vercel.app/**`

No need to add `/auth/reset-password` or `/auth/callback` separately if you have the `/**` wildcard.

## 3. After deploy

- **Password reset:** Sign in → Forgot password → enter email → open link in email. You should land on “Reset Your Password” (if the link hits any page, the app redirects you there).  
- **Blue (if used):** Admin → Blue → Invites → create invite → open link in incognito → complete form + Stripe. Use test card `4242 4242 4242 4242` if Stripe is in test mode.

## 4. 15-minute smoke test (do this first)

**Goal: One successful test before production.**

1. **Sign-in (2 min)** — Open production URL → Sign in → sign in with a real account. You should land on home or dashboard.
2. **Password reset (5 min)** — Sign out → Sign in → Forgot your password? → enter email → Send reset link. Open the email, click the link. You must land on **Reset Your Password** (two fields). Enter new password, submit. See success and redirect to sign in.
3. **Blue (optional, ~8 min)** — Sign in as admin → Admin → Blue → Invites → Create invite → copy link. Open in incognito, fill form, waiver, submit → Stripe (4242 4242 4242 4242) → success page.

If step 2 fails: Supabase URL Configuration → Site URL = production origin, Redirect URLs include `https://YOUR_DOMAIN/**`. Request a **new** reset email.

## 5. If something breaks

- **Reset link goes to wrong page:** Redirect URLs in Supabase must include your production domain with `/**`. Site URL = production origin.  
- **Blue checkout error:** Check Stripe key is `sk_...` and `STRIPE_BLUE_PRICE_ID` is set.  
- **“Table does not exist”:** Run the SQL in `docs/blue-membership-tables.md` in Supabase SQL Editor.
