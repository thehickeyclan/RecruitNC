import { describe, expect, it } from "vitest"
import {
  clampProspectRankingsLimit,
  DEFAULT_PUBLIC_RANKINGS_CAP,
  getPublicRankingsMax,
  isPublicRankingsYearPublished,
  isRankedClassYear,
  PUBLISHED_PUBLIC_RANKINGS_YEARS,
  PUBLIC_RANKINGS_MAX_BY_YEAR,
} from "@/lib/public-rankings-cap"

describe("public rankings cap", () => {
  it("serves exactly the three released classes, and nothing else", () => {
    /*
     * Depth and release used to be the same map, so locking the release meant emptying the
     * caps - and a publish would then have fallen back to the default thirty and put twenty
     * unranked 2029 wrestlers on a public page. They are separate now: the caps say how deep
     * each board goes, PUBLIC_RELEASED_YEARS says which are live.
     */
    expect(PUBLISHED_PUBLIC_RANKINGS_YEARS).toEqual([2027, 2028, 2029])
    expect(isPublicRankingsYearPublished(2027)).toBe(true)
    expect(isPublicRankingsYearPublished(2029)).toBe(true)
    // Released is not the same as visible: the entitlement check runs first, so these boards
    // still reach only Blue members, verified coaches and subscribers.
    expect(isPublicRankingsYearPublished(2026)).toBe(false)
    expect(isPublicRankingsYearPublished(2030)).toBe(false)
  })

  it("keeps each board's depth regardless of whether it is released", () => {
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2027]).toBe(30)
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2028]).toBe(30)
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2029]).toBe(15)
    // A graduated class is not ranked at all, so it has no depth and cannot be previewed.
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2026]).toBeUndefined()
    expect(isRankedClassYear(2029)).toBe(true)
    expect(isRankedClassYear(2026)).toBe(false)
  })

  it("keeps safe caps available for internal calculations", () => {
    expect(clampProspectRankingsLimit(2029, null)).toBe(15)
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
