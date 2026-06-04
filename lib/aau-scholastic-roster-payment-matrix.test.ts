import { describe, expect, it } from "vitest"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "./aau-scholastic-duals-2026-content"
import {
  aauLineToPaymentColumn,
  buildAauScholasticRosterPaymentMatrix,
  paymentAmountsFromRegistration,
} from "./aau-scholastic-roster-payment-matrix"
import type { NhscaDuals2026Registration } from "./nhsca-duals-2026-registrations"

function aauReg(
  partial: Partial<NhscaDuals2026Registration> & Pick<NhscaDuals2026Registration, "athlete_first_name" | "athlete_last_name">,
): NhscaDuals2026Registration {
  return {
    id: partial.id ?? "reg-1",
    event_slug: AAU_SCHOLASTIC_EVENT_SLUG,
    athlete_email: "",
    parent_email: partial.parent_email ?? "parent@example.com",
    high_school: "Test HS",
    graduation_year: "2027",
    primary_weight: partial.primary_weight ?? "132",
    reg_fee_cents: partial.reg_fee_cents ?? 0,
    apparel_fee_cents: partial.apparel_fee_cents ?? 0,
    status: partial.status ?? "paid",
    order_id: partial.order_id ?? "order-1",
    created_at: "2026-01-01T00:00:00Z",
    ...partial,
  }
}

describe("aauLineToPaymentColumn", () => {
  it("maps catalog keys to payment columns", () => {
    expect(aauLineToPaymentColumn("tournament_reg", "Tournament registration")).toBe("tournament_reg_cents")
    expect(aauLineToPaymentColumn("singlet", "Singlet")).toBe("apparel_cents")
    expect(aauLineToPaymentColumn("flight", "Flight")).toBe("flight_cents")
    expect(aauLineToPaymentColumn("hotel_van", "Hotel & team van")).toBe("hotel_cents")
  })
})

describe("paymentAmountsFromRegistration", () => {
  it("splits checkout lines into category columns", () => {
    const encoded =
      "tournament_reg:7500:Tournament%20registration|singlet:6500:Singlet|flight:35500:Flight|hotel_van:31500:Hotel%20%26%20team%20van"
    const amounts = paymentAmountsFromRegistration({
      event_slug: AAU_SCHOLASTIC_EVENT_SLUG,
      checkout_lines: encoded,
      reg_fee_cents: 0,
      apparel_fee_cents: 0,
    })
    expect(amounts).toEqual({
      tournament_reg_cents: 7500,
      apparel_cents: 6500,
      flight_cents: 35500,
      hotel_cents: 31500,
    })
  })
})

describe("buildAauScholasticRosterPaymentMatrix", () => {
  it("maps paid registration to roster wrestler with column totals", () => {
    const matrix = buildAauScholasticRosterPaymentMatrix([
      aauReg({
        athlete_first_name: "Mac",
        athlete_last_name: "Johnson",
        checkout_lines:
          "tournament_reg:7500:Tournament%20registration|singlet:6500:Singlet|flight:35500:Flight|hotel_van:31500:Hotel%20%26%20team%20van",
      }),
    ])

    const mac = matrix.roster.find((r) => r.wrestler === "Mac Johnson")
    expect(mac?.payments).toMatchObject({
      tournament_reg_cents: 7500,
      apparel_cents: 6500,
      flight_cents: 35500,
      hotel_cents: 31500,
      total_cents: 81000,
      is_paid: true,
    })
    expect(matrix.summary.paidOnRoster).toBe(1)
    expect(matrix.summary.columnTotals.total_cents).toBe(81000)
  })

  it("lists paid athletes not on roster under extras", () => {
    const matrix = buildAauScholasticRosterPaymentMatrix([
      aauReg({
        athlete_first_name: "Unknown",
        athlete_last_name: "Wrestler",
        primary_weight: "999",
        checkout_lines: "tournament_reg:7500:Tournament%20registration",
      }),
    ])
    expect(matrix.extras).toHaveLength(1)
    expect(matrix.extras[0]?.athlete_name).toBe("Unknown Wrestler")
  })
})
