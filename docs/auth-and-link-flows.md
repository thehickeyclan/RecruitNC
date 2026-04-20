# Auth and link flows (how users and links are associated)

---

## Parent already has a RecruitNC account (Blue signup)

**What the parent does:**

1. **Sign in** to RecruitNC (same email they’ll use for Blue).
2. Get the **Blue registration link** (from admin or email):  
   `https://app.ncwrestlingunited.com/blue/register` (or with optional `?invite=TOKEN` to pre-fill email).
3. **Open that link** in the same browser where they’re signed in (or sign in first, then open the link).
4. On the Blue form they’ll see: **“You’re signed in as [their email]. We’ll use this account — leave password blank.”**  
   Name/email are pre-filled. They **leave the password field blank**.
5. Fill in **athlete** info (name, graduation year, high school, etc.), accept the waiver, click **Complete registration**.
6. They’re sent to **Stripe** to pay. After payment they land on the Blue success page.

**What the system does:**

- The page sees they’re signed in and pre-fills their email/name; it does not overwrite with any invite email.
- On submit, the request sends their session cookie (`credentials: "include"`).
- The API reads the session. If the form’s parent email **matches** the signed-in user’s email, it uses that user as the payer. No password is required.
- The API creates/links the athlete, creates the Blue membership and parent–athlete link, then redirects to Stripe.

**If it asks for a password:** They’re either not signed in, or they opened the link in a different browser/device. They should sign in to RecruitNC (with that email), then open the same Blue link again and leave password blank.

**Can I send the link to someone who isn’t logged in?** Yes.

- **They already have a RecruitNC account:** They open the link → click “Sign in” (or go to Sign in) → after sign-in they’re sent back to the same Blue link → form shows “You’re signed in… leave password blank” → they submit with password blank.
- **They don’t have an account:** They open the link → fill in email, name, **and a password** (to create an account), plus athlete info → submit. The system creates their account and completes Blue registration.

---

## Password reset

1. User goes to **Sign in** → **Forgot your password?** → enters email → **Send reset link**.
2. App calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: base + "/auth/reset-password" })`. Supabase sends an email.
3. Link in email goes to `https://app.ncwrestlingunited.com/auth/reset-password?code=...` or via **`/auth/callback?code=...&next=/auth/reset-password`** (or Supabase may send to Site URL; then **RecoveryRedirect** on any page detects `code` / `token_hash` and redirects to `/auth/reset-password` with the same params).
4. **Reset-password page**: The **server** checks for an existing session in cookies (covers the callback redirect case where the browser client could not read HttpOnly cookies). The **client** still exchanges `code` / hash / `token_hash` when present. User enters new + confirm password → **POST `/api/auth/update-password`** (server runs `updateUser` with the cookie session) → success → redirect to sign-in.
5. **Supabase:** Site URL and Redirect URLs must include your production origin (e.g. `https://YOUR_DOMAIN/**`) and **`https://YOUR_DOMAIN/auth/reset-password`** so the link is allowed.

**Association:** The reset link is one-time and is tied to the **email** you requested it for. No “user” is associated until the link is used and the code is exchanged; then that session is the user.

**If someone sees a “landing” page but no password fields:** Usually the reset session never reached the browser (expired link, wrong domain, or email opened the generic home URL without `code`). They should request a new link from **Forgot password** and use the same email as their account.

---

## Blue registration (invite → parent → athlete)

1. **Admin** creates an invite in **Admin → Blue → Invites** (optional). Share the same link for everyone: `https://app.ncwrestlingunited.com/blue/register`. Optional per-invite link: `https://app.ncwrestlingunited.com/blue/register?invite=TOKEN`.
2. **Parent** opens that link. The page validates the token via `/api/blue/invites/validate?token=TOKEN`. If the invite had an optional email, it can pre-fill; **if the user is already signed in**, the form pre-fills from the session and does **not** overwrite with invite email (so the session user is used).
3. Parent submits the form. Frontend sends `credentials: "include"` so the request includes the session cookies.
4. **API** `/api/blue/register`:
   - Reads **session** via `supabase.auth.getUser()` (cookies from the request).
   - If **session user’s email** matches **parent.email** from the form → use that user as `payer_user_id` (no password needed).
   - Else if **parent.password** is provided (min 8 chars) → create new user and profile, use that as `payer_user_id`.
   - Else → 400: “Sign in with this email first, or provide a password.”
5. API then resolves or creates the **athlete**, creates **blue_memberships** (one row per athlete, `payer_user_id` = parent), and **parent_athlete_links** (links parent user to athlete). Then redirects to Stripe Checkout.

**Association:**
- **Invite link** → one row in `blue_invites` (token, optional email, used_at when consumed).
- **Parent** = the logged-in user (if email matches) or the newly created user. Stored as `payer_user_id` on `blue_memberships` and as `user_id` on `parent_athlete_links`.
- **Athlete** = resolved by name/graduation year/school or created; linked to parent via `parent_athlete_links` and `blue_memberships.athlete_id`.

**If “signed in but API says provide password”:** The server didn’t get the session (e.g. cookies not sent or wrong domain). Ensure the form POST uses `credentials: "include"` and that the app and API are on the same origin so cookies are sent.
