import { describe, expect, it } from "vitest"
import {
  clampProspectRankingsLimit,
  getPublicRankingsMax,
  PUBLIC_RANKINGS_MAX_BY_YEAR,
} from "@/lib/public-rankings-cap"

describe("public rankings cap", () => {
  it("publishes top 30 for every class year", () => {
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2026]).toBe(30)
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2027]).toBe(30)
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2028]).toBe(30)
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2029]).toBe(30)
  })

  it("clamps 'all' and oversized topN to top 30", () => {
    expect(clampProspectRankingsLimit(2026, null)).toBe(30)
    expect(clampProspectRankingsLimit(2026, 1000)).toBe(30)
    expect(clampProspectRankingsLimit(2026, 10)).toBe(10)
    expect(clampProspectRankingsLimit(2028, 50)).toBe(30)
  })

  it("defaults unknown years to 30", () => {
    expect(getPublicRankingsMax(2031)).toBe(30)
  })
})
