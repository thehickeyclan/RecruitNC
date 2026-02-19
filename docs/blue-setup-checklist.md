# Blue Program Setup Checklist

Use this to get Blue invite-only registration + billing working from scratch.

---

## 1. Database (Supabase)

1. Open your Supabase project → **SQL Editor**.
2. Open **`docs/blue-membership-tables.md`** in this repo.
3. Run **all three SQL blocks** in order (blue_invites, parent_athlete_links, blue_memberships).
4. If you already created `blue_memberships` earlier, run the **migration block** at the bottom of that doc (adds `pending_payment` and Stripe columns).

---

## 2. Stripe (payment)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) and sign in.
2. Get your **Secret key**: Developers → API keys → **Secret key** (use **Test** for now). Copy it.
3. In your project, create **`.env.local`** in the repo root (if it doesn’t exist) and add:
   ```bash
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
   ```
   (paste your real key instead of `sk_test_...`).
4. In the same folder, run:
   ```bash
   node scripts/create-stripe-blue-product.js
   ```
5. The script prints a line like:
   ```bash
   STRIPE_BLUE_PRICE_ID=price_xxxxxxxxxxxx
   ```
   Add that line to **`.env.local`** and save.
6. **Webhook** (so Stripe can tell your app “payment succeeded”):
   - Stripe Dashboard → Developers → Webhooks → **Add endpoint**.
   - **Endpoint URL**: `https://YOUR-DOMAIN.com/api/webhooks/stripe`  
     (e.g. `https://recruitnc.com/api/webhooks/stripe`, or your Vercel URL for testing).
   - **Events**: select **checkout.session.completed**.
   - After saving, open the webhook and copy the **Signing secret** (starts with `whsec_`).
   - Add to `.env.local`:
     ```bash
     STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
     ```
   - Redeploy your app so it has the new env var.

---

## 3. Install dependencies

In the repo root:

```bash
npm install
```

(This installs `stripe` and the rest.)

---

## 4. Test the flow

1. **Create an invite**  
   Sign in as admin → **Blue Invites** → Create link (optional email/notes) → copy the registration link.

2. **Register**  
   Open the link in a private/incognito window. Fill parent + athlete, submit. You should be sent to Stripe Checkout ($55/month).

3. **Pay (test)**  
   Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC. Complete checkout.

4. **Success**  
   You should land on the welcome page (practices, GroupMe, calendar, sign in).

5. **Confirm in Stripe**  
   Stripe Dashboard → Customers and Subscriptions. You should see the new customer and subscription.

6. **Confirm in Supabase**  
   Table `blue_memberships`: the row for that athlete should have `status = active` and `stripe_subscription_id` set.

---

## Quick reference

| Thing | Where |
|-------|--------|
| Create invite links | Admin → Blue Invites |
| Registration form | `/blue/register?invite=TOKEN` (from invite link) |
| After payment | `/blue/register/success` (welcome message) |
| If they cancel payment | `/blue/register/cancelled` |
| Stripe webhook | `POST /api/webhooks/stripe` |
| Env vars | `.env.local`: `STRIPE_SECRET_KEY`, `STRIPE_BLUE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` |

---

## Stuck?

- **“Table does not exist”** → Run the SQL in step 1 (and the migration if the table already existed).
- **“Payment is not configured”** → Step 2: add `STRIPE_SECRET_KEY` and `STRIPE_BLUE_PRICE_ID` and run the script.
- **Payment succeeds but membership stays “pending”** → Webhook not working: check `STRIPE_WEBHOOK_SECRET`, webhook URL, and that you deployed after adding the secret. In Stripe → Webhooks → your endpoint, check “Recent deliveries” for errors.
