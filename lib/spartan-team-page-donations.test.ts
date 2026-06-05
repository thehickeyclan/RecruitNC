import { describe, expect, it } from "vitest"
import {
  isSpartanTeamPageAthleteDonationsDisabled,
  isSpartanTeamPageCheckout,
} from "./spartan-team-page-donations"

describe("spartan-team-page-donations", () => {
  it("treats non-hub checkout as spartan team page", () => {
    expect(isSpartanTeamPageCheckout({ fundraisingHub: false })).toBe(true)
    expect(isSpartanTeamPageCheckout({ fundraisingHub: true })).toBe(false)
  })

  it("defaults athlete donations off on spartan team page", () => {
    expect(isSpartanTeamPageAthleteDonationsDisabled()).toBe(true)
  })
})
