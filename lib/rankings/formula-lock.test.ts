/**
 * The formula is locked. Changing it has to be deliberate and visible.
 *
 * Six scoring changes went in over one afternoon — the missed-window cap, graded ranked wins,
 * the TOC opponent fix, the upset check, the duals scale, the standing labels. Every one was a
 * real defect and every one moved the board underneath a reviewer who was mid-order. Forty-seven
 * of ninety-two wrestlers moved on a single commit. That is not a ranking anybody can work with,
 * however correct each step was.
 *
 * So the constants are pinned here, with the number written out. A change to any of them fails
 * this file, and the failure is the point: it forces whoever makes it to say what they are
 * changing, re-read the model document, and tell the person whose order is about to move. Update
 * the number here in the same commit as the change, never separately.
 *
 * This pins arithmetic on purpose, which `ranking-policy.test.ts` deliberately does not. The two
 * exist for opposite reasons: policy tests say what must stay true when the numbers change, and
 * this says the numbers may not change quietly.
 */
import { describe, expect, it } from "vitest"
import { RANKING_COMPONENT_WEIGHTS } from "./recruitnc-ranking-engine"
import { MAX_WINDOW_PENALTY, WINDOW_PARTICIPATION_FLOOR } from "./missed-window"
import { NATIONAL_RANKED_WIN, RANKED_WIN_CAP, TOC_FIELD_WIN, UNGRADED_RANKED_WIN, rankedOpponentValue } from "./ranked-win-value"
import { dualsRecordPoints, teamRoundBonus } from "./nhsca-duals-resume"

describe("component weights", () => {
  it("are exactly these", () => {
    expect(RANKING_COMPONENT_WEIGHTS).toEqual({
      allAmerican: 1,
      rankedWins: 1,
      matchResume: 1.1,
      national: 1.2,
      state: 0.35,
      duals: 1.2,
      rankWrestler: 1,
      collegeOpen: 0,
      profile: 0,
    })
  })
})

describe("the missed-window penalty", () => {
  it("fires at two fifths of the class and caps at thirty in total", () => {
    expect(WINDOW_PARTICIPATION_FLOOR).toBe(0.4)
    expect(MAX_WINDOW_PENALTY).toBe(30)
  })
})

describe("what a quality win pays", () => {
  it("is graded by the opponent's ranking", () => {
    expect(NATIONAL_RANKED_WIN).toBe(18)
    expect(rankedOpponentValue(1)).toBe(16)
    expect(rankedOpponentValue(8)).toBe(13)
    expect(rankedOpponentValue(15)).toBe(10)
    expect(rankedOpponentValue(40)).toBe(8)
    expect(TOC_FIELD_WIN).toBe(9)
    expect(UNGRADED_RANKED_WIN).toBe(7)
    expect(RANKED_WIN_CAP).toBe(80)
  })
})

describe("what a duals week pays", () => {
  it("matches the scale the 2025 rows were scored on", () => {
    expect(dualsRecordPoints(7, 1)).toBe(21)
    expect(dualsRecordPoints(5, 3)).toBe(15)
    expect(teamRoundBonus("Champion")).toBe(20)
    expect(teamRoundBonus("Round of 32")).toBe(8)
    expect(teamRoundBonus("Round of 64")).toBe(5)
  })
})
