/**
 * The thirty-one states opened on 6 November 2026, and the two things that must stay true of them.
 *
 * The bar Matt set: a profile for every 2026 state qualifier, men and women, who has a class year,
 * with national results linked. Qualifiers, not placers - the whole field, not the podium. Eight
 * went live first; the gender leg was then measured separately and seven more cleared it
 * (MS KY NJ NY CT MO MI), two of them carrying a single naming row Matt waived explicitly. The
 * third wave is the sixteen western states, which had been minted from their podiums only and sat
 * at 20-47% of their qualifier field; `--include-qualifiers` created 8,854 profiles and attached
 * 32,876 bouts, taking every one of them to 99.4% or better on both genders.
 *
 * What the held states fail on is never naming. Arkansas, Maine, Wisconsin, Vermont and Rhode
 * Island hold the podium only - a median of 8 entrants per bracket where a real field is 16, so
 * the qualifiers are not in the table at all. Pennsylvania has the field but we know the class
 * year for only 76% of the boys and 64% of the girls. Louisiana has both and is held on the
 * pre-freshman gate: 21 results sit on profiles before that wrestler's freshman year.
 *
 * The trap this file exists to hold shut: `isRankedState` treats a state with no `ranked` key as
 * ranked. Flipping `live` alone would have put thirty-one empty ranking boards into the product, since
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

const OPENED = [
  // the first wave, 6 November 2026
  "DE", "MN", "WV", "AL", "FL", "NH", "IA", "MA",
  // the second, once the bar was measured for men and women separately
  "MS", "KY", "NJ", "NY", "CT", "MO", "MI",
  // the third: the western wave, minted from the field instead of the podium
  "WA", "UT", "KS", "CO", "OR", "ID", "MT", "NE", "AZ", "WY", "NM", "SD", "ND", "NV", "HI", "CA",
] as const
// Held, and the reason is in the header: podium-only holds, unknown class years, or a data gate.
const HELD = ["RI", "LA", "MD", "WI", "AR", "ME", "VT", "PA"] as const

const state = (code: string) => {
  const s = RECRUITING_BRAND.states.find((x) => x.code === code)
  if (!s) throw new Error(`no such state in the brand: ${code}`)
  return s
}

describe("the states opened on the qualifier bar", () => {
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
