import { describe, expect, it } from "vitest"
import {
  clampProspectRankingsLimit,
  DEFAULT_PUBLIC_RANKINGS_CAP,
  getPublicRankingsMax,
  isPublicRankingsYearPublished,
  PUBLISHED_PUBLIC_RANKINGS_YEARS,
  PUBLIC_RANKINGS_MAX_BY_YEAR,
} from "@/lib/public-rankings-cap"

describe("public rankings cap", () => {
  it("publishes top 30 only for active public class years", () => {
    expect(PUBLISHED_PUBLIC_RANKINGS_YEARS).toEqual([2027, 2028])
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2026]).toBeUndefined()
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2027]).toBe(30)
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2028]).toBe(30)
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2029]).toBeUndefined()
    expect(isPublicRankingsYearPublished(2027)).toBe(true)
    expect(isPublicRankingsYearPublished(2029)).toBe(false)
  })

  it("clamps 'all' and oversized topN to top 30", () => {
    expect(clampProspectRankingsLimit(2027, null)).toBe(30)
    expect(clampProspectRankingsLimit(2027, 1000)).toBe(30)
    expect(clampProspectRankingsLimit(2027, 10)).toBe(10)
    expect(clampProspectRankingsLimit(2028, 50)).toBe(30)
  })

  it("defaults unknown years to the published cap", () => {
    expect(getPublicRankingsMax(2031)).toBe(30)
  })

  /**
   * The cap silently moved from 30 to 20 in an unrelated commit and stayed there, hiding
   * ten ranked wrestlers per class from every public surface. Assert the number itself so
   * a change to it has to be deliberate.
   */
  it("keeps the published cap at 30", () => {
    expect(DEFAULT_PUBLIC_RANKINGS_CAP).toBe(30)
  })
})
