import { describe, expect, it } from "vitest"
import { AAU_SCHOLASTIC_EVENT_SLUG } from "./aau-scholastic-duals-2026-content"
import {
  checkoutLineItemsToDisplay,
  isGenericPlaceholderOrderItemName,
  resolveRegistrationOrderLines,
} from "./nhsca-hub-checkout-pricing"

describe("isGenericPlaceholderOrderItemName", () => {
  it("treats NHSCA Duals bundle product name as placeholder", () => {
    expect(isGenericPlaceholderOrderItemName("NHSCA Duals 2026 – Registration + Apparel")).toBe(true)
    expect(isGenericPlaceholderOrderItemName("NHSCA 2026 – Registration + Apparel")).toBe(true)
  })

  it("does not treat expanded hub lines as placeholder", () => {
    expect(isGenericPlaceholderOrderItemName("Team Shorts (M)")).toBe(false)
    expect(isGenericPlaceholderOrderItemName("Long Sleeve Tee (L)")).toBe(false)
  })
})

describe("AAU checkout line SKUs", () => {
  it("adds catalog SKU to each decoded checkout line", () => {
    const lines = checkoutLineItemsToDisplay(
      [
        { key: "tournament_reg", name: "Tournament registration", amountCents: 7500, quantity: 1 },
        { key: "hotel_van", name: "Hotel & team van", amountCents: 31500, quantity: 1 },
        { key: "flight", name: "Flight", amountCents: 35500, quantity: 1 },
      ],
      AAU_SCHOLASTIC_EVENT_SLUG,
    )
    expect(lines.map((l) => l.sku)).toEqual(["AAU26-REG", "AAU26-HOTEL-VAN", "AAU26-FLIGHT"])
  })

  it("infers AAU travel and apparel SKUs from fee split", () => {
    const lines = resolveRegistrationOrderLines({
      event_slug: AAU_SCHOLASTIC_EVENT_SLUG,
      reg_fee_cents: 75_00 + 315_00,
      apparel_fee_cents: 65_00 + 40_00 + 40_00 + 30_00,
    })
    expect(lines.map((l) => l.sku)).toEqual([
      "AAU26-REG",
      "AAU26-HOTEL-VAN",
      "AAU26-SINGLET",
      "AAU26-LONG-SLEEVE",
      "AAU26-SHORTS",
      "AAU26-TEE",
    ])
  })
})
