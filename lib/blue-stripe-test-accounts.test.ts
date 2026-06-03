import { describe, expect, it } from "vitest"
import {
  isBlueStripeTestCustomerEmail,
  isBlueStripeTestSubscription,
  stripeSubscriptionCustomerEmail,
} from "./blue-stripe-test-accounts"

describe("blue-stripe-test-accounts", () => {
  it("flags known test customer emails", () => {
    expect(isBlueStripeTestCustomerEmail("thehickeyclan@gmail.com")).toBe(true)
    expect(isBlueStripeTestCustomerEmail("JeannineAponte@gmail.com")).toBe(true)
    expect(isBlueStripeTestCustomerEmail("servando58@gmail.com")).toBe(false)
  })

  it("reads email from expanded Stripe customer", () => {
    const sub = {
      customer: { email: "thehickeyclan@gmail.com", deleted: false },
    } as import("stripe").Stripe.Subscription
    expect(stripeSubscriptionCustomerEmail(sub)).toBe("thehickeyclan@gmail.com")
    expect(isBlueStripeTestSubscription(sub)).toBe(true)
  })
})
