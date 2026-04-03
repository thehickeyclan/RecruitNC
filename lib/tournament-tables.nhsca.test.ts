import { describe, expect, it } from "vitest"
import { getNameVariants } from "@/lib/tournament-tables"

describe("getNameVariants (NHSCA matching)", () => {
  it("expands Matthew ↔ Matt for roster/placement name drift", () => {
    const v = getNameVariants("Matthew Hickey")
    expect(v.some((x) => x.includes("Matt Hickey"))).toBe(true)
    const v2 = getNameVariants("Matt Hickey")
    expect(v2.some((x) => x.includes("Matthew Hickey"))).toBe(true)
  })

  it("still includes Zach/Zack style pairs", () => {
    const v = getNameVariants("Zach Smith")
    expect(v.some((x) => x.toLowerCase().includes("zack"))).toBe(true)
  })
})
