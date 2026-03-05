# Blue Program: Pre-Launch Checklist

Use this to get the **entire workflow** ready for testing and sending real invites.

---

## 1. Database (Supabase)

Run in **Supabase → SQL Editor** in this order:

1. Open **`docs/blue-membership-tables.md`**.
2. Run **Section 1** (`blue_invites`).
3. Run **Section 2** (`parent_athlete_links`).
4. Run **Section 3** (`blue_memberships`).
5. Run **Section 4** (`blue_promo_codes`) — needed if you use scholarship/promo codes at checkout.
6. Run **Section 5** (`liability_waivers`) — required for registration (waiver acceptance is stored here).
7. Run the **“Linking to interest forms”** block (adds `interest_id` to `blue_invites`) — only if you use Blue Interest Forms and want “Invite sent” / “Enrolled” checkboxes.
8. If `blue_memberships` already existed before: run the **Migration** block at the bottom (adds `pending_payment`, Stripe columns).

**Interest form table:** If you use the Interest Forms admin page, ensure `blue_express_interest` exists (see `docs/blue-express-interest-table.md`).

---

## 2. Environment variables

In **`.env.local`** (and in your host’s env, e.g. Vercel), set:

| Variable | Required | Purpose |
|----------|----------|--------|
| `STRIPE_SECRET_KEY` | Yes | Stripe API (use **Test** key first: `sk_test_...`). |
| `STRIPE_BLUE_PRICE_ID` | Yes | Blue subscription price (from script below). |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret(s). **Multiple destinations?** Use comma-separated secrets (e.g. `whsec_Blue,whsec_Store`) so Blue, Store, and other Stripe flows all work without one env update breaking another. |
| `NEXT_PUBLIC_APP_URL` | Yes | Full app URL (e.g. `https://recruitnc.com` or your Vercel URL). Used in invite links and Stripe success/cancel URLs. |
| `RESEND_API_KEY` | Optional but recommended | Sends invite emails when you create an invite with an email. Without it, you can still create invites and copy the link to send yourself. |

**Get the price ID:** In the repo root (with `STRIPE_SECRET_KEY` set in `.env.local`):

```bash
node scripts/create-stripe-blue-product.js
```

Add the printed line to `.env.local`:

```bash
STRIPE_BLUE_PRICE_ID=price_xxxxxxxxxxxx
```

---

## 3. Stripe webhook

**If you use Event destinations** (Stripe Dashboard → Developers → **Event destinations**):

1. Open your destination (e.g. **Blue-Subscription**) that sends to `https://app.ncwrestlingunited.com/api/webhooks/stripe`.
2. Copy the **Signing secret** shown on that destination’s details (click **Signing secret** to reveal).
3. In **Vercel** → your project → Settings → Environment Variables, set **`STRIPE_WEBHOOK_SECRET`** to that exact value for the **Production** environment.
4. **Redeploy** (or trigger a new deployment). The secret must match the destination that sends events; using a different secret (e.g. from the classic Webhooks page) causes **400 Invalid signature** and events will fail.

**If you use classic Webhooks** (Developers → Webhooks → Add endpoint):

1. **Endpoint URL:** `https://app.ncwrestlingunited.com/api/webhooks/stripe` (must match `NEXT_PUBLIC_APP_URL`).
2. **Events:** include **`checkout.session.completed`**, **`payment_intent.succeeded`**, **`customer.subscription.updated`**, **`customer.subscription.deleted`** (and any others the app expects).
3. After saving, copy the **Signing secret** (`whsec_...`) and set **`STRIPE_WEBHOOK_SECRET`** in Vercel (Production).
4. **Redeploy.**

**Local testing:** use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

**Multiple destinations / endpoints:** If more than one Stripe destination or webhook endpoint sends to the same URL (e.g. Blue-Subscription + Store), set **`STRIPE_WEBHOOK_SECRET`** to a comma-separated list of all their signing secrets (e.g. `whsec_abc,whsec_def`). The app tries each in turn so no single flow breaks when you add or change another.

---

## 4. Resend (invite emails)

1. Sign up at [resend.com](https://resend.com) and get an API key.
2. Add **`RESEND_API_KEY=re_xxxx`** to `.env.local` and your host.
3. Ensure the “From” domain is verified in Resend (the app sends from `info@ncwrestlingunited.com`).

If you skip Resend, invites still work: create an invite, copy the registration link, and send it yourself (email, text, etc.). The link is token-based and can be forwarded.

---

## 5. Test the full flow (before sending real invites)

Do this in **Stripe Test mode** (test keys and test card).

1. **Create an invite**  
   Admin → Blue Program → Invites. Copy the **registration link** (same for everyone): `https://app.ncwrestlingunited.com/blue/register`. Optionally create an invite and send by email.

2. **Open the link** in an incognito/private window. You should see the Blue registration form (parent + athlete, waiver, optional promo).

3. **Fill and submit**  
   Use a test parent email (e.g. your own or a test inbox). Create a new athlete or use minimal info. Accept the waiver. Submit.

4. **Stripe Checkout**  
   You should be redirected to Stripe. Use test card **4242 4242 4242 4242**, any future expiry, any CVC. Complete payment.

5. **Success page**  
   You should land on “You’re in — welcome to NC United Blue” with next steps (practices, GroupMe, calendar).

6. **Verify in Stripe**  
   Dashboard → Customers and Subscriptions: new customer and active subscription.

7. **Verify in Supabase**  
   - `blue_memberships`: one row for that athlete with `status = active`, `stripe_subscription_id` set, `source = invite`.  
   - `blue_invites`: that invite’s `used_at` is set.  
   - `liability_waivers`: one row for that parent + athlete.  
   - `parent_athlete_links`: one row linking parent user to athlete.

8. **Admin**  
   Blue → Subscriptions: the new member appears. Blue → Reports: counts and MRR update.

9. **Optional: cancel path**  
   Create another invite, go through the form, get to Stripe Checkout, then click “Back” or close. You should land on the cancelled page. That invite is already marked used; a second registration would need a new invite.

---

## 6. Optional: promo codes

If you use scholarship/promo codes:

1. DB: Section 4 of `blue-membership-tables.md` must be run.
2. Admin → Blue Program → Scholarship codes: create a code (e.g. test 100% off). The app creates a Stripe Coupon and stores it.
3. On the registration form, enter the code and submit; Checkout should show the discount.

---

## 7. Parent profile: view Blue memberships and manage billing

After sign-in, parents can go to **Profile** (nav or `/profile`). If they pay for one or more Blue memberships, a sidebar card **NC United Blue** lists each athlete, status, and a **Manage billing** button. That button opens Stripe’s Customer Portal so they can update payment method, cancel, or view invoices.

**Stripe Customer Portal:** The first time you use “Manage billing,” Stripe may prompt you to configure the portal. In Stripe Dashboard go to **Settings → Billing → Customer portal**, enable the options you want (e.g. “Customers can update payment methods”, “Customers can cancel subscriptions”), then Save.

---

## 8. Go live (when ready)

1. Switch Stripe to **Live** mode: replace `sk_test_...` with `sk_live_...`, create the Blue product/price in Live (or use existing), set `STRIPE_BLUE_PRICE_ID` to the live price id.
2. Add a **live** webhook endpoint in Stripe (same URL, live mode) and set `STRIPE_WEBHOOK_SECRET` to the live signing secret.
3. Confirm `NEXT_PUBLIC_APP_URL` is your production URL.
4. Run through one full test in Live with a real card (then cancel the subscription in Stripe if needed).

---

## Quick reference

| Thing | Where |
|-------|--------|
| Create invite / send email | Admin → Blue Program → Invites |
| Interest forms (invite sent / enrolled) | Admin → Blue Program → Interest forms |
| Registration form | `https://app.ncwrestlingunited.com/blue/register` (optional `?invite=TOKEN`) |
| After payment | `/blue/register/success` |
| Cancelled payment | `/blue/register/cancelled` |
| Subscriptions list | Admin → Blue Program → Subscriptions |
| Reports | Admin → Blue Program → Reports |
| Parent: view/manage Blue | Sign in → **Profile** → “NC United Blue” card → Manage billing |
| Env vars | `STRIPE_SECRET_KEY`, `STRIPE_BLUE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY` (optional) |

---

## Stuck?

- **“Table does not exist”** → Run the matching section in `docs/blue-membership-tables.md` (and the migration block if the table already existed).
- **“Payment is not configured”** → Set `STRIPE_SECRET_KEY` and `STRIPE_BLUE_PRICE_ID`; run `node scripts/create-stripe-blue-product.js` if needed.
- **Payment succeeds but membership stays “pending”** → Webhook: check `STRIPE_WEBHOOK_SECRET`, endpoint URL, and that the app was redeployed. In Stripe → Webhooks → your endpoint, check “Recent deliveries” for errors.
- **Invite email not sending** → Set `RESEND_API_KEY` and verify the From domain in Resend. You can still use the invite by copying the link and sending it yourself.
