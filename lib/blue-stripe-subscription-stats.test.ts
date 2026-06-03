import { describe, expect, it } from "vitest"
import {
  aggregateBlueStripeSubscriptionStats,
  classifyBlueStripeSubscription,
  isBlueStripeSubscription,
} from "./blue-stripe-subscription-stats"

const blueSub = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "sub_test",
    status: "active",
    cancel_at_period_end: false,
    items: {
      data: [
        {
          price: {
            id: "price_blue",
            nickname: "Blue Program Monthly",
            product: { name: "Blue Program Monthly" },
            unit_amount: 5500,
            recurring: { interval: "month", interval_count: 1 },
          },
          quantity: 1,
        },
      ],
    },
    ...overrides,
  }) as import("stripe").Stripe.Subscription

describe("isBlueStripeSubscription", () => {
  it("matches STRIPE_BLUE_PRICE_ID", () => {
    expect(isBlueStripeSubscription(blueSub(), "price_blue")).toBe(true)
    expect(
      isBlueStripeSubscription(
        blueSub({
          items: {
            data: [
              {
                price: {
                  id: "price_other",
                  nickname: "Other",
                  product: { name: "Other Program" },
                },
              },
            ],
          },
        }),
        "price_blue",
      ),
    ).toBe(false)
  })
})

describe("classifyBlueStripeSubscription", () => {
  it("classifies collection paused as paused", () => {
    expect(classifyBlueStripeSubscription(blueSub({ pause_collection: { behavior: "void" } })).bucket).toBe(
      "paused",
    )
  })

  it("classifies cancel_at_period_end as canceling", () => {
    expect(classifyBlueStripeSubscription(blueSub({ cancel_at_period_end: true })).bucket).toBe("canceling")
  })

  it("classifies canceled status as cancelled", () => {
    expect(classifyBlueStripeSubscription(blueSub({ status: "canceled" })).bucket).toBe("cancelled")
  })
})

describe("aggregateBlueStripeSubscriptionStats", () => {
  it("sums buckets without double counting", () => {
    const stats = aggregateBlueStripeSubscriptionStats([
      blueSub(),
      blueSub({ id: "sub_2", pause_collection: { behavior: "void" } }),
      blueSub({ id: "sub_3", cancel_at_period_end: true }),
      blueSub({ id: "sub_4", status: "canceled" }),
    ])
    expect(stats.total).toBe(4)
    expect(stats.active).toBe(1)
    expect(stats.paused).toBe(1)
    expect(stats.cancelingAtPeriodEnd).toBe(1)
    expect(stats.cancelled).toBe(1)
  })
})
