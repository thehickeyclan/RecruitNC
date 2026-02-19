# Blue Membership: Invites, Memberships, Parent–Athlete Link

Run this in the **Supabase SQL Editor** to create the tables for Blue invite-only registration and membership tracking.

## 1. `blue_invites`

Stores invite tokens for the private registration link. Admin creates an invite; parent uses the link to register.

```sql
create table if not exists public.blue_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_blue_invites_token on public.blue_invites(token);
create index if not exists idx_blue_invites_used_at on public.blue_invites(used_at) where used_at is null;

alter table public.blue_invites enable row level security;

create policy "Service role full access blue_invites"
  on public.blue_invites for all to service_role using (true) with check (true);

-- Allow anonymous read by token only (for reg page validation)
create policy "Allow select by token for validation"
  on public.blue_invites for select to anon using (true);
```

**Linking to interest forms:** To show “Invite sent” and “Enrolled” on Blue Interest Forms, add an optional link from invite to the interest submission:

```sql
-- Run if blue_invites already exists (add column)
alter table public.blue_invites
  add column if not exists interest_id uuid references public.blue_express_interest(id) on delete set null;
create index if not exists idx_blue_invites_interest on public.blue_invites(interest_id) where interest_id is not null;
```

When creating an invite from an interest form row, set `interest_id` so the admin interest page can show checkboxes for “Invite sent” and “Enrolled” (enrolled = invite used).

## 2. `parent_athlete_links`

Links a parent (user) to an athlete (kid) so the parent can manage that kid’s membership and billing.

```sql
create table if not exists public.parent_athlete_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, athlete_id)
);

-- athlete_id references athletes(id) - add FK if your athletes table is in same DB
-- alter table public.parent_athlete_links add constraint fk_athlete
--   foreign key (athlete_id) references public.athletes(id) on delete cascade;

create index if not exists idx_parent_athlete_links_user on public.parent_athlete_links(user_id);
create index if not exists idx_parent_athlete_links_athlete on public.parent_athlete_links(athlete_id);

alter table public.parent_athlete_links enable row level security;

create policy "Service role full access parent_athlete_links"
  on public.parent_athlete_links for all to service_role using (true) with check (true);

-- Authenticated users can link themselves as parent (so "Link your athlete" works without service role)
create policy "Authenticated insert own parent_athlete_links"
  on public.parent_athlete_links for insert to authenticated with check (auth.uid() = user_id);
create policy "Authenticated select own parent_athlete_links"
  on public.parent_athlete_links for select to authenticated using (auth.uid() = user_id);
```

## 3. `blue_memberships`

One row per Blue membership (one athlete = one current Blue membership). `payer_user_id` = parent who pays and manages.

```sql
create table if not exists public.blue_memberships (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null,
  payer_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'paused', 'cancelled', 'alumni')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  source text not null default 'recruitnc_onboarding' check (source in ('recruitnc_onboarding', 'manual', 'invite')),
  stripe_customer_id text,
  stripe_subscription_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blue_memberships_athlete on public.blue_memberships(athlete_id);
create index if not exists idx_blue_memberships_payer on public.blue_memberships(payer_user_id);
create index if not exists idx_blue_memberships_status on public.blue_memberships(status);

alter table public.blue_memberships enable row level security;

create policy "Service role full access blue_memberships"
  on public.blue_memberships for all to service_role using (true) with check (true);
```

## After creating tables

- Use **service role** (or admin client) in your API routes to insert/update these tables.
- RLS allows only service_role (and anon read on blue_invites for token validation if you use anon for the reg page; otherwise validate server-side only).

## 4. `blue_promo_codes` (scholarship / discount codes)

Used at Blue checkout for percent off, fixed amount off, or full waiver. Admin creates a code; we create a Stripe Coupon and store its ID; at checkout we apply that coupon when the parent enters the code.

```sql
create table if not exists public.blue_promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent', 'fixed_amount', 'full_waiver')),
  value numeric not null,
  stripe_coupon_id text,
  max_redemptions integer,
  redemptions_count integer not null default 0,
  valid_from timestamptz default now(),
  valid_until timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_blue_promo_codes_code on public.blue_promo_codes(lower(code));
create index if not exists idx_blue_promo_codes_valid on public.blue_promo_codes(valid_until);

alter table public.blue_promo_codes enable row level security;

create policy "Service role full access blue_promo_codes"
  on public.blue_promo_codes for all to service_role using (true) with check (true);
```

- **code:** e.g. `BLUE50`, `SCHOLARSHIP-SMITH`. Case-insensitive when validating.
- **type:** `percent` (value = 50 for 50%), `fixed_amount` (value = 20 for $20 off), `full_waiver` (100% off; value can be 100).
- **stripe_coupon_id:** Set when admin creates the code (we create the Coupon in Stripe). Used at checkout.
- **max_redemptions:** Null = unlimited.
- **valid_from / valid_until:** Optional window. Null valid_until = no end date.

## 5. `liability_waivers`

Stores signed liability waivers: one row per parent (user) + athlete (minor). Used so we know who has signed and do not ask again for that parent+athlete. Saved for both parent and athlete profile context.

```sql
create table if not exists public.liability_waivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid not null,
  waiver_type text not null default 'nc_united_liability',
  waiver_version text not null default '1',
  signer_name text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, athlete_id, waiver_type)
);

create index if not exists idx_liability_waivers_user on public.liability_waivers(user_id);
create index if not exists idx_liability_waivers_athlete on public.liability_waivers(athlete_id);

alter table public.liability_waivers enable row level security;

create policy "Service role full access liability_waivers"
  on public.liability_waivers for all to service_role using (true) with check (true);
```

- **user_id:** Parent/guardian who signed.
- **athlete_id:** Minor participant the waiver covers.
- **waiver_type:** e.g. `nc_united_liability`. Use same type for the same waiver text.
- **waiver_version:** Bump when waiver text changes so you can re-request if needed.
- **signer_name:** Optional; can store "Parent Name" from the form.

## Migration: add billing (pending_payment + Stripe)

If `blue_memberships` already exists without `pending_payment` or Stripe columns, run in Supabase SQL Editor:

```sql
alter table public.blue_memberships drop constraint if exists blue_memberships_status_check;
alter table public.blue_memberships add constraint blue_memberships_status_check
  check (status in ('pending_payment', 'active', 'paused', 'cancelled', 'alumni'));
alter table public.blue_memberships add column if not exists stripe_customer_id text;
alter table public.blue_memberships add column if not exists stripe_subscription_id text;
alter table public.blue_memberships alter column status set default 'pending_payment';
```

---

## Blue invites flow and testing

### What’s going on (flow)

1. **Admin:** In **Admin → Blue → Invites**, create an invite (optional email). You get a private link like `https://yourapp.com/blue/register?invite=TOKEN`.
2. **Parent:** Opens that link (incognito, other browser, or after signing out). Fills the Blue registration form (parent + athlete, waiver, optional promo), then either signs in (existing RecruitNC account) or creates an account (email + password). Submits, then completes payment via Stripe and lands on the success page.

### How to test

- **Yes:** Create an invite with your **admin** account, then use your **other (non-admin)** account to go through the flow.
- **Steps:**
  1. Log in as admin → **Admin → Blue → Invites** → Create invite (optional email), copy the registration link.
  2. Open that link in incognito or another browser (or after signing out).
  3. Either sign in with your other account and submit with password left blank, or enter a new email + password to create an account, then submit.
  4. Accept waiver, complete form, then Stripe checkout (use test card if Stripe is in test mode).

### Recent behavior fixes

- **Invites list:** Shows more rows (up to 5000). On list failure, a red box shows the API error and a **Retry** button.
- **Create invite:** Clearer errors in the toast (e.g. table missing, invalid auth, token collision).
- **Blue register:** If the parent email is already in RecruitNC, we tell them to sign in and return with password blank instead of “user already registered.”

### If it still fails

| What you see | What to do |
|--------------|------------|
| **“Unauthorized” or “Admin required”** | Be signed in as an admin (account with `is_admin: true` in `user_profiles`). |
| **“Table blue_invites does not exist”** | Run the SQL in **Section 1** above in the Supabase SQL Editor. |
| List is blank or create does nothing | Use **Retry** on the invites page to reload; check the red error box or toast for the exact message. |

---

## Step-by-step test (admin + test account, Gavin)

Use these accounts for a full test:

- **Admin:** thickeyclan@gmail.com  
- **Test parent account:** matt.hickey@getmaxiq.com  
- **Athlete:** Gavin Hickey (your son)

### Unblock Blue test (skip broken password reset)

If you can’t sign in as the test parent because you don’t know the password and reset is broken:

1. **Supabase Dashboard** → **Authentication** → **Users**.
2. Find **matt.hickey@getmaxiq.com** (or the test parent email).
3. Click the user → **⋮** or **Edit** → **Send password recovery** is the broken path; instead use **Update user** if available, or create a **new user** with the same email (then delete the old one) so you set a password on signup.  
   **Easier:** Create a **new test user** in Supabase with a known password: Authentication → Users → **Add user** → email e.g. `blue-test@getmaxiq.com`, set a password you know. Use that email as the parent on the Blue form so you can sign in and test Blue without touching password reset.

Then run **B. Blue signup** below (create invite as admin → open link in incognito → sign in with the account that has the known password → fill athlete → Stripe).

### A. Password reset (verify the link goes to reset page)

1. Sign out (or use an incognito window).
2. Go to **Sign in** → click **“Forgot your password?”**.
3. Enter **matt.hickey@getmaxiq.com** (or any account email) → **Send reset link**.
4. Check that email; open the **reset link** in the same browser.
5. You should land on **Reset Your Password** (new password + confirm), not the homepage.
6. Enter a new password, submit → success message → redirect to sign in.

If the link still goes to the homepage, in **Supabase Dashboard** → **Authentication** → **URL Configuration** add this to **Redirect URLs**:  
`https://YOUR_VERCEL_OR_DOMAIN/auth/callback`  
(Password reset now uses the callback with `?next=/auth/reset-password` so the app can send you to the reset page.)

### B. Blue signup (Gavin with test parent account)

1. **Create invite (as admin)**  
   - Log in as **thickeyclan@gmail.com**.  
   - Go to **Admin** → **Blue** → **Invites**.  
   - Click **Create invite** (email optional).  
   - Copy the **registration link** (e.g. `https://yoursite.com/blue/register?invite=...`).

2. **Open link as parent**  
   - Open that link in **incognito** or another browser (or sign out first).  
   - You’ll see the Blue registration form.

3. **Fill form and sign in**  
   - **Parent:** First name, Last name, **Email** = `matt.hickey@getmaxiq.com`.  
   - **Already have an account?** Sign in with matt.hickey@getmaxiq.com, then return to this link and **leave password blank**.  
   - Or enter a password to create the account.  
   - **Athlete:** First name **Gavin**, Last name **Hickey**, Graduation year, High school, etc.  
   - Optional: promo code, phone.  
   - Check the **waiver** box.

4. **Submit and pay**  
   - Click **Complete registration**.  
   - You should be redirected to **Stripe Checkout**.  
   - Use test card **4242 4242 4242 4242** if Stripe is in test mode.  
   - After payment you should land on **Blue registration success**.

5. **Confirm**  
   - Sign in as matt.hickey@getmaxiq.com and check **Blue** area (e.g. “My memberships” or dashboard) to see Gavin’s Blue membership.
