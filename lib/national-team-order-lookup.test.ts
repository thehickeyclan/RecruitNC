import { describe, expect, it } from "vitest"
import {
  findNationalTeamRegistrationForOrder,
  isRegistrationStronglyLinkedToOrder,
  registrationAmountMatchesOrder,
} from "./national-team-order-lookup"

describe("isRegistrationStronglyLinkedToOrder", () => {
  it("links by order_id or matching payment intent", () => {
    expect(
      isRegistrationStronglyLinkedToOrder(
        { id: "ord-1", stripe_payment_intent_id: "pi_a" },
        { order_id: "ord-1", stripe_payment_intent_id: "pi_b" },
      ),
    ).toBe(true)
    expect(
      isRegistrationStronglyLinkedToOrder(
        { id: "ord-1", stripe_payment_intent_id: "pi_a" },
        { order_id: "ord-2", stripe_payment_intent_id: "pi_a" },
      ),
    ).toBe(true)
    expect(
      isRegistrationStronglyLinkedToOrder(
        { id: "ord-1", stripe_payment_intent_id: "pi_a" },
        { order_id: "ord-2", stripe_payment_intent_id: "pi_b" },
      ),
    ).toBe(false)
  })
})

describe("registrationAmountMatchesOrder", () => {
  it("requires order total to match registration checkout total", () => {
    const reg = {
      checkout_lines: "team_package:25000:NHSCA%20Team%20Package",
      reg_fee_cents: 25000,
      apparel_fee_cents: 0,
    }
    expect(registrationAmountMatchesOrder({ total: 250 }, reg)).toBe(true)
    expect(registrationAmountMatchesOrder({ total: 30 }, reg)).toBe(false)
  })
})

describe("findNationalTeamRegistrationForOrder", () => {
  it("does not fuzzy-link parent email when totals differ ($30 ghost vs $250 reg)", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null }),
            ilike: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: "reg-tobin",
                      athlete_first_name: "Tobin",
                      athlete_last_name: "McNair",
                      parent_email: "kpm1602@aol.com",
                      status: "paid",
                      order_id: null,
                      stripe_payment_intent_id: "pi_nhsca_250",
                      checkout_lines: "team_package:25000:NHSCA%20Team%20Package",
                      reg_fee_cents: 25000,
                      apparel_fee_cents: 0,
                      event_slug: "nhsca-duals-2026",
                    },
                  ],
                }),
              }),
            }),
          }),
        }),
      }),
    }

    const result = await findNationalTeamRegistrationForOrder(supabase as never, {
      id: "ghost-order",
      customer_email: "kpm1602@aol.com",
      customer_name: "Keith McNair",
      stripe_payment_intent_id: "pi_guild_30",
      total: 30,
    })

    expect(result).toBeNull()
  })
})
