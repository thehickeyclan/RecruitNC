import { describe, expect, it } from "vitest"
import type Stripe from "stripe"
import { deriveCheckoutAttributionFromStripeSession } from "@/lib/spartan-donation-checkout-attribution"

function session(partial: Partial<Stripe.Checkout.Session> & Pick<Stripe.Checkout.Session, "id">): Stripe.Checkout.Session {
  return partial as Stripe.Checkout.Session
}

describe("deriveCheckoutAttributionFromStripeSession", () => {
  it("uses metadata when present", () => {
    const s = session({
      id: "cs_test",
      metadata: {
        fundraising_checkout_surface: "athlete_page",
        fundraising_athlete_slug: "ncu-foo-27",
      },
    })
    expect(deriveCheckoutAttributionFromStripeSession(s)).toEqual({
      fundraisingCheckoutSurface: "athlete_page",
      fundraisingAthleteSlug: "ncu-foo-27",
    })
  })

  it("infers athlete page from success_url", () => {
    const s = session({
      id: "cs_test",
      success_url: "https://app.example.com/fundraising/athletes/ncu-padgett-27/thanks?session_id={CHECKOUT_SESSION_ID}",
      metadata: {},
    })
    expect(deriveCheckoutAttributionFromStripeSession(s)).toEqual({
      fundraisingCheckoutSurface: "athlete_page",
      fundraisingAthleteSlug: "ncu-padgett-27",
    })
  })

  it("infers spartan team page from success_url", () => {
    const s = session({
      id: "cs_test",
      success_url: "https://app.example.com/spartan/thanks?session_id=x",
      metadata: {},
    })
    expect(deriveCheckoutAttributionFromStripeSession(s)).toEqual({
      fundraisingCheckoutSurface: "spartan_team_page",
      fundraisingAthleteSlug: null,
    })
  })

  it("infers hub give from success_url", () => {
    const s = session({
      id: "cs_test",
      success_url: "https://app.example.com/fundraising/give/thanks?session_id=x",
      metadata: {},
    })
    expect(deriveCheckoutAttributionFromStripeSession(s)).toEqual({
      fundraisingCheckoutSurface: "hub_give",
      fundraisingAthleteSlug: null,
    })
  })
})
