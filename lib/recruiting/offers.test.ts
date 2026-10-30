import { describe, expect, it } from "vitest"

import { bottomLine, cleanOffer, parseDollars, rankOffers } from "./offers"

const offer = (o: Partial<Parameters<typeof bottomLine>[0]> = {}) => ({ cost: null, grants: 0, merit: 0, athletic: 0, revenueShare: 0, otherAid: 0, loans: 0, years: 4, renews: "yes" as const, ...o })

describe("parseDollars", () => {
  it("reads what a parent types", () => {
    expect(parseDollars("$12,400")).toBe(12400)
    expect(parseDollars(" 8000 ")).toBe(8000)
    expect(parseDollars("")).toBe(0)
    expect(parseDollars("ten")).toBeNull()
    expect(parseDollars(-5)).toBeNull()
  })
})

describe("bottomLine", () => {
  it("subtracts grants and scholarships from the published cost", () => {
    const b = bottomLine(offer({ grants: 5000, merit: 10000, athletic: 15000 }), 60000)!
    expect(b.perYear).toBe(30000)
    expect(b.fourYears).toBe(120000)
    expect(b.costFrom).toBe("published")
  })

  it("counts written revenue share or NIL from the college like a scholarship", () => {
    expect(bottomLine(offer({ athletic: 10000, revenueShare: 5000 }), 40000)!.perYear).toBe(25000)
  })

  it("never treats a loan as a discount", () => {
    const b = bottomLine(offer({ merit: 10000, loans: 5500 }), 40000)!
    expect(b.perYear).toBe(30000)
    expect(b.loans).toBe(5500)
  })

  it("uses the cost on the offer letter over the published one", () => {
    const b = bottomLine(offer({ cost: 70000, athletic: 20000 }), 60000)!
    expect(b.perYear).toBe(50000)
    expect(b.costFrom).toBe("offer")
  })

  it("charges full price for the years the offer does not cover", () => {
    const b = bottomLine(offer({ athletic: 20000, years: 1 }), 50000)!
    expect(b.perYear).toBe(30000)
    expect(b.fourYears).toBe(30000 + 3 * 50000)
  })

  it("shows the worst case when the athletic award is not promised every year", () => {
    const b = bottomLine(offer({ merit: 10000, athletic: 20000, renews: "unknown" }), 50000)!
    expect(b.fourYears).toBe(4 * 20000)
    expect(b.ifNotRenewed).toBe(20000 + 3 * 40000)
    expect(bottomLine(offer({ merit: 10000, athletic: 20000, renews: "yes" }), 50000)!.ifNotRenewed).toBeNull()
    expect(bottomLine(offer({ merit: 10000, renews: "no" }), 50000)!.ifNotRenewed).toBeNull()
  })

  it("never owes less than nothing", () => {
    expect(bottomLine(offer({ athletic: 90000 }), 50000)!.perYear).toBe(0)
  })

  it("needs a cost to start from", () => {
    expect(bottomLine(offer({ merit: 1000 }), null)).toBeNull()
  })
})

describe("cleanOffer", () => {
  it("accepts typed dollar amounts", () => {
    expect(cleanOffer({ grants: "$7,395", athletic: "10000", years: 4, renews: "no" })).toMatchObject({ grants: 7395, athletic: 10000, renews: "no", cost: null })
  })
  it("rejects an empty offer and nonsense", () => {
    expect(typeof cleanOffer({})).toBe("string")
    expect(typeof cleanOffer({ merit: "lots" })).toBe("string")
    expect(typeof cleanOffer({ merit: 1000, years: 7 })).toBe("string")
  })
})

describe("rankOffers", () => {
  it("puts the cheapest four years first and drops schools without a figure", () => {
    const a = { id: "a", line: bottomLine(offer({ merit: 1000 }), 30000) }
    const b = { id: "b", line: bottomLine(offer({ athletic: 30000 }), 50000) }
    const c = { id: "c", line: null }
    expect(rankOffers([a, b, c]).map((r) => r.id)).toEqual(["b", "a"])
  })
})
