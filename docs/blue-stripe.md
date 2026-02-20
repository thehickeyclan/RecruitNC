# Blue program — Stripe integration

Stripe is used for Blue membership subscription payment after invite registration.

## Flow

1. Parent uses invite link → `/blue/register?invite=TOKEN` → fills form (or signs in) → submits.
2. **API** `POST /api/blue/register`: validates invite, creates/links parent & athlete, creates `blue_memberships` row with `status: 'pending_payment'`, then creates a **Stripe Checkout Session** (subscription mode) and returns `checkoutUrl`.
3. Parent is redirected to Stripe Checkout → pays → Stripe sends **webhook** `checkout.session.completed` to our endpoint.
4. **Webhook** `POST /api/webhooks/stripe`: reads `metadata.membership_id`, updates `blue_memberships` to `status: 'active'` and stores `stripe_customer_id` and `stripe_subscription_id`.
5. Parent lands on **success page** `/blue/register/success` (or cancel page if they abandon).

## Env vars (required for payment)

- `STRIPE_SECRET_KEY` — Stripe secret key (live or test).
- `STRIPE_BLUE_PRICE_ID` — Stripe Price ID for the Blue subscription (recurring).
- `STRIPE_WEBHOOK_SECRET` — Signing secret for the webhook (from Stripe Dashboard → Developers → Webhooks).

Also ensure `NEXT_PUBLIC_APP_URL` is set (e.g. `https://app.ncwrestlingunited.com`) so success/cancel URLs are correct.

## Webhook in Stripe

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://app.ncwrestlingunited.com/api/webhooks/stripe` (or your production origin + `/api/webhooks/stripe`).
3. Events: `checkout.session.completed`.
4. Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

## Verifying Stripe works

- **Checkout**: Create an invite, complete registration up to “Complete registration” → you should be redirected to Stripe Checkout. If you see “Payment is not configured yet”, env vars are missing or wrong.
- **Webhook**: After completing payment in test mode, check Stripe Dashboard → Webhooks → your endpoint → “Recent events”. Success = 200. Our handler updates `blue_memberships` to `active` and stores Stripe IDs.
- **Success page**: After payment, Stripe redirects to `/blue/register/success?session_id=...`. No server-side session verification is done on that page; membership is activated by the webhook.

## Code references

- Create session: `app/api/blue/register/route.ts` (Stripe checkout session, metadata `membership_id`).
- Webhook: `app/api/webhooks/stripe/route.ts` (only `checkout.session.completed`; updates `blue_memberships`).
