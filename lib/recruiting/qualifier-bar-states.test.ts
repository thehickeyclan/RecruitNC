/**
 * The eight states opened on 6 November 2026, and the two things that must stay true of them.
 *
 * The bar Matt set: a profile for every 2026 state qualifier who has a class year, with national
 * results linked. Qualifiers, not placers - the whole field, not the podium. Measured that day,
 * twelve states had a profile for 100% of their 2026 qualifiers carrying a class year; Georgia and
 * Tennessee were already live, Louisiana was still red on the pre-freshman gate, and Rhode Island
 * was held back because its 100% was 88 wrestlers out of a 344-wrestler field - it passes the bar
 * by the letter while we do not know three-quarters of its class years.
 *
 * The trap this file exists to hold shut: `isRankedState` treats a state with no `ranked` key as
 * ranked. Flipping `live` alone would have put eight empty ranking boards into the product, since
 * the board builds its own state list from `rankedStates`. The checklist is explicit - "never show
 * an empty one" - so every state here carries `ranked: false` until it has a published board.
 */
import { describe, expect, it } from "vitest"
import {
  COVERAGE_NAMES_UP_TO,
  RECRUITING_BRAND,
  isRankedState,
  liveStates,
  rankedStates,
  recruitingCoverage,
} from "@/lib/recruiting/brand"

const OPENED = ["DE", "MN", "WV", "AL", "FL", "NH", "IA", "MA"] as const
const HELD = ["RI", "LA", "MD", "MS", "WI"] as const

const state = (code: string) => {
  const s = RECRUITING_BRAND.states.find((x) => x.code === code)
  if (!s) throw new Error(`no such state in the brand: ${code}`)
  return s
}

describe("the eight states opened on the qualifier bar", () => {
  it("are live on RecruitWrestlers", () => {
    const live = new Set(liveStates(true).map((s) => s.code))
    for (const code of OPENED) expect(live.has(code), `${code} should be live`).toBe(true)
  })

  it("claims no ranking board for any of them, so none can show an empty one", () => {
    const ranked = new Set(rankedStates(true).map((s) => s.code))
    for (const code of OPENED) {
      expect(isRankedState(state(code)), `${code} must carry ranked: false`).toBe(false)
      expect(ranked.has(code), `${code} must not be in rankedStates`).toBe(false)
    }
  })

  it("leaves the ranking board to the two states that have one", () => {
    expect(rankedStates(true).map((s) => s.code)).toEqual(["NC", "SC"])
  })

  it("changes nothing on NC United, which reports North Carolina only", () => {
    expect(liveStates(false).map((s) => s.code)).toEqual(["NC"])
    expect(recruitingCoverage(false)).toBe("North Carolina")
  })

  it("keeps the states that did not clear the bar closed", () => {
    const live = new Set(liveStates(true).map((s) => s.code))
    for (const code of HELD) expect(live.has(code), `${code} should not be live yet`).toBe(false)
  })
})

describe("recruitingCoverage past the naming ceiling", () => {
  it("counts the states instead of listing thirteen of them", () => {
    expect(liveStates(true).length).toBeGreaterThan(COVERAGE_NAMES_UP_TO)
    expect(recruitingCoverage(true)).toBe(`${liveStates(true).length} states`)
  })

  it("never returns a bare list long enough to break a sentence", () => {
    const coverage = recruitingCoverage(true)
    expect(coverage.split(",").length).toBeLessThanOrEqual(COVERAGE_NAMES_UP_TO)
  })
})
