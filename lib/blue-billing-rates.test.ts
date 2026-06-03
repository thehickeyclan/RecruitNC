import { describe, expect, it } from "vitest"
import { sumWiqStandardMrrCents, wiqStandardMrrCentsFromAmount } from "./blue-billing-rates"

describe("wiqStandardMrrCentsFromAmount", () => {
  it("uses $50 for standard and $51 export lines", () => {
    expect(wiqStandardMrrCentsFromAmount(5100)).toBe(5000)
    expect(wiqStandardMrrCentsFromAmount(5000)).toBe(5000)
  })

  it("keeps family discount amounts", () => {
    expect(wiqStandardMrrCentsFromAmount(3825)).toBe(3825)
  })

  it("excludes comps", () => {
    expect(wiqStandardMrrCentsFromAmount(0)).toBe(0)
  })
})

describe("sumWiqStandardMrrCents", () => {
  it("sums billable at standard rates", () => {
    expect(
      sumWiqStandardMrrCents([{ amount_cents: 5100 }, { amount_cents: 5100 }, { amount_cents: 0 }]),
    ).toBe(10000)
  })
})
