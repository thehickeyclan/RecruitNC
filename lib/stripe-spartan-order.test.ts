import { describe, expect, it } from "vitest"
import { resolveSpartanLineItemName } from "./stripe-spartan-order"

describe("resolveSpartanLineItemName", () => {
  it("labels Spartan team page / training fund gifts", () => {
    expect(resolveSpartanLineItemName({ fundraising_checkout_surface: "spartan_team_page" })).toBe(
      "NC United Training Fund donation",
    )
    expect(resolveSpartanLineItemName({ fundraising_checkout_surface: "training_fund" })).toBe(
      "NC United Training Fund donation",
    )
  })

  it("labels athlete-attributed gifts", () => {
    expect(
      resolveSpartanLineItemName({
        athlete_display_name: "Matt Hickey",
        athlete_code: "NCU-HICKEY-29",
      }),
    ).toBe("Fundraising donation · Matt Hickey")
  })

  it("labels race contributions", () => {
    expect(
      resolveSpartanLineItemName({
        fundraising_type: "race_donation",
        tier_preference: "super",
      }),
    ).toBe("NC United × Spartan Fayetteville — super")
  })
})
