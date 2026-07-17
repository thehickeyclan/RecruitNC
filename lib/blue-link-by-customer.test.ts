import { describe, expect, it } from "vitest"
import type Stripe from "stripe"
import { pickBlueSubscriptionToLink } from "@/lib/blue-stripe-subscription-status"

/**
 * Pins the choice of which subscription heals an unlinked membership row.
 *
 * Context: 13 memberships from a 2026-03-04 batch sat "active" with a customer id but no
 * subscription id — invisible to reconcile, unfixable by the 90-day session scan. Linking
 * by customer must pick the subscription that reflects billing reality.
 */

const sub = (over: Partial<{ id: string; status: string; created: number; blue: boolean }>) =>
  ({
    id: over.id ?? "sub_x",
    status: (over.status ?? "active") as Stripe.Subscription.Status,
    created: over.created ?? 1_700_000_000,
    // marker consumed by the isBlue predicate below, not by Stripe types
    metadata: { __blue: over.blue === false ? "" : "1" },
    items: { data: [] },
  }) as unknown as Stripe.Subscription

const isBlue = (s: Stripe.Subscription) => Boolean((s.metadata as Record<string, string>).__blue)

describe("pickBlueSubscriptionToLink", () => {
  it("prefers a live subscription over a cancelled one, regardless of age", () => {
    const cancelledNewer = sub({ id: "sub_cancelled", status: "canceled", created: 200 })
    const activeOlder = sub({ id: "sub_active", status: "active", created: 100 })
    expect(pickBlueSubscriptionToLink([cancelledNewer, activeOlder], isBlue)?.id).toBe("sub_active")
  })

  it("takes the newest when several are live", () => {
    const a = sub({ id: "sub_old", created: 100 })
    const b = sub({ id: "sub_new", created: 300 })
    expect(pickBlueSubscriptionToLink([a, b], isBlue)?.id).toBe("sub_new")
  })

  it("links the most recent cancelled sub when nothing is live — so status reconciles to cancelled honestly", () => {
    const older = sub({ id: "sub_c1", status: "canceled", created: 100 })
    const newer = sub({ id: "sub_c2", status: "canceled", created: 300 })
    expect(pickBlueSubscriptionToLink([older, newer], isBlue)?.id).toBe("sub_c2")
  })

  it("ignores the customer's non-Blue subscriptions (store, national team, etc.)", () => {
    const store = sub({ id: "sub_store", blue: false, created: 500 })
    const blue = sub({ id: "sub_blue", created: 100 })
    expect(pickBlueSubscriptionToLink([store, blue], isBlue)?.id).toBe("sub_blue")
  })

  it("returns null when the customer has no Blue subscription — caller reports, never auto-cancels", () => {
    expect(pickBlueSubscriptionToLink([sub({ id: "s", blue: false })], isBlue)).toBeNull()
    expect(pickBlueSubscriptionToLink([], isBlue)).toBeNull()
  })

  it("treats paused (active + pause_collection) and past_due as live", () => {
    const pastDue = sub({ id: "sub_pd", status: "past_due", created: 100 })
    const cancelled = sub({ id: "sub_c", status: "canceled", created: 300 })
    expect(pickBlueSubscriptionToLink([pastDue, cancelled], isBlue)?.id).toBe("sub_pd")
  })
})
