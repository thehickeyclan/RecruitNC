import { describe, expect, it } from "vitest"
import {
  classBoardKindLabel,
  clampProspectRankingsLimit,
  DEFAULT_PUBLIC_RANKINGS_CAP,
  getPublicRankingsMax,
  isPublicRankingsYearPublished,
  isRankedClassYear,
  isWatchlistYear,
  PUBLISHED_PUBLIC_RANKINGS_YEARS,
  PUBLIC_RANKINGS_MAX_BY_YEAR,
} from "@/lib/public-rankings-cap"

describe("public rankings cap", () => {
  it("does not publish any class before the official release", () => {
    /*
     * Depth and release used to be the same map, so locking the release meant emptying the
     * caps - and a publish would then have fallen back to the default thirty and put twenty
     * unranked 2029 wrestlers on a public page. They are separate now: the caps say how deep
     * each board goes, PUBLIC_RELEASED_YEARS says which are live.
     */
    expect(PUBLISHED_PUBLIC_RANKINGS_YEARS).toEqual([])
    expect(isPublicRankingsYearPublished(2027)).toBe(false)
    expect(isPublicRankingsYearPublished(2029)).toBe(false)
    expect(isPublicRankingsYearPublished(2026)).toBe(false)
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

describe("the 2029 watch list", () => {
  it("presents 2029 as prospects to watch, not a ranking", () => {
    /*
     * One high school season is not enough to put a number on a freshman class. Ranking it
     * forced an argument we cannot win - a 5A state champion at 106 against a third-place
     * finisher at 165 - and a top ten meant cutting one of them to fit the other.
     */
    expect(isWatchlistYear(2029)).toBe(true)
    expect(classBoardKindLabel(2029)).toBe("Prospects to Watch")
  })

  it("leaves the older classes as rankings", () => {
    expect(isWatchlistYear(2027)).toBe(false)
    expect(isWatchlistYear(2028)).toBe(false)
    expect(classBoardKindLabel(2027)).toBe("Rankings")
  })

  it("is fifteen deep, so nobody is cut to fit a round number", () => {
    expect(PUBLIC_RANKINGS_MAX_BY_YEAR[2029]).toBe(15)
  })
})
