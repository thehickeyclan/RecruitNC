# Store migration: post-copy final steps

After all files are copied into RecruitNC, everything left is on the **RecruitNC / infra side**. This repo doesn’t need any further code changes to “enable” migration.

---

## RecruitNC checklist

1. **Env vars** (store code expects these; RecruitNC likely has most already):
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY` (or whatever `sendOrderConfirmationEmail` uses in RecruitNC’s `lib/email`)
   - `NEXT_PUBLIC_SITE_URL` (or equivalent) for confirmation/return URLs

2. **Stripe webhook cutover:** In Stripe Dashboard → Webhooks, point the endpoint to RecruitNC’s URL (e.g. `https://<recruitnc>/api/webhooks/stripe`) and ensure `payment_intent.succeeded` (and any other store events) are selected. Disable or remove the old store app’s webhook endpoint so only RecruitNC creates orders.

3. **Redirect old store (when ready):** If the standalone store had its own domain (e.g. store.ncwrestlingunited.com), add 301 redirects to the RecruitNC store path (e.g. `https://<recruitnc>/store`). That can be done in Vercel/host config or in the old store’s `next.config.js` redirects; no change required in this repo.

4. **One end-to-end test:** Place a test order on RecruitNC (catalog → cart → checkout → payment) and confirm the order appears in Supabase and confirmation email sends.

**Reference repo (e-commerce-homepage-build):** No further code or config is required for migration. It remains the reference; once RecruitNC is live, the standalone store can be retired or left as redirect-only.

---

## Supporting docs

**In the reference repo (e-commerce-homepage-build):**
- **`FILES_TO_COPY_TO_RECRUITNC.md`** — Concrete list of files to copy (with links to code), Tier 1 → 2 → 3, and what to adapt after copy.
- **`STORE_FLOWS_FOR_RECRUITNC.md`** — Routes, key files, checkout sequence, webhook events, admin.
- **`RECRUITNC_PHASE1_ROUTE_STUBS.md`** — Route stubs to add in RecruitNC (`/store`, `/cart`, `/checkout/*`, optional admin).

**In this repo (RecruitNC):**
- **`docs/STORE_SETUP.md`** — Env vars, layout/nav, testing checklist.
- **`docs/STORE_FLOWS_FOR_RECRUITNC.md`** — Same flows reference (if present).
- **`docs/STORE-MIGRATION-PLAN.md`** — Migration plan and phases.

---

*Document version: 1.0 — for RecruitNC team to execute store migration using shared database and Stripe.*
