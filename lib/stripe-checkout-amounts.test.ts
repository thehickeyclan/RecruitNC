import { describe, expect, it } from "vitest"
import {
  amountLooksLikeGuild,
  amountLooksLikePracticeDropIn,
} from "./stripe-checkout-amounts"

describe("stripe checkout amounts", () => {
  it("treats $25 as practice drop-in band", () => {
    expect(amountLooksLikePracticeDropIn(25)).toBe(true)
    expect(amountLooksLikePracticeDropIn(30)).toBe(false)
  })

  it("treats $30 as guild band", () => {
    expect(amountLooksLikeGuild(30)).toBe(true)
    expect(amountLooksLikeGuild(25)).toBe(false)
  })
})
