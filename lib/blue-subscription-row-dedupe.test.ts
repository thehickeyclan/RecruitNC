import { describe, expect, it } from "vitest"
import { dedupeBlueSubscriptionRows } from "./blue-subscription-row-dedupe"
import type { BlueSubscriptionRow } from "@/app/api/admin/blue/subscriptions/route"

const row = (overrides: Partial<BlueSubscriptionRow>): BlueSubscriptionRow =>
  ({
    id: "m1",
    athlete_id: "a1",
    athlete_name: "Abdel Adam",
    payer_user_id: "p1",
    payer_name: "Quaevon Cannon",
    payer_email: "cannonq@gcsnc.com",
    status: "active",
    amount_display: "$55/month",
    started_at: "",
    created_at: "",
    stripe_subscription_id: null,
    stripe_customer_id: null,
    resume_at: null,
    next_billing_at: null,
    last_payment_at: null,
    ended_at: null,
    cancel_at_period_end: false,
    card_display: null,
    stripe_enrichment_error: null,
    plan_name: null,
    source: "unavailable",
    notes: null,
    signup_id: null,
    paid_invoice_count: 0,
    lifetime_paid_display: null,
    ...overrides,
  }) as BlueSubscriptionRow

describe("dedupeBlueSubscriptionRows", () => {
  it("keeps one live Stripe row and drops orphan duplicate for same member", () => {
    const out = dedupeBlueSubscriptionRows([
      row({ id: "orphan", stripe_subscription_id: null, next_billing_at: null }),
      row({
        id: "live",
        stripe_subscription_id: "sub_live",
        source: "live",
        next_billing_at: "2026-06-21T00:00:00.000Z",
        amount_display: "$55.00/mo",
      }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].stripe_subscription_id).toBe("sub_live")
  })
})
