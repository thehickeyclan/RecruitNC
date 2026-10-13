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
import {
  RANKING_COMPONENT_WEIGHTS,
  WOMENS_EVENT_WEIGHTS,
  WOMENS_QUALIFIERS_COUNTED,
  WOMENS_RANKING_COMPONENT_WEIGHTS,
  isWomensTopTierEvent,
  womensNationalRankingPoints,
  isStatePoolEvent,
  womensPoolEventPoints,
  isInsideWomensWindow,
  isWomensNationalDuals,
  womensNationalDualsPoints,
} from "./recruitnc-ranking-engine"
import { MAX_WINDOW_PENALTY, WINDOW_PARTICIPATION_FLOOR } from "./missed-window"
import { NATIONAL_RANKED_WIN, RANKED_WIN_CAP, TOC_FIELD_WIN, UNGRADED_RANKED_WIN, rankedOpponentValue } from "./ranked-win-value"
import { dualsRecordPoints, teamRoundBonus } from "./nhsca-duals-resume"

describe("women's weights (Matt, 8 October 2026: freestyle nationals, then freestyle qualifiers, then NHSCA, states last)", () => {
  it("are exactly these", () => {
    expect(WOMENS_RANKING_COMPONENT_WEIGHTS).toEqual({
      allAmerican: 1.2,
      rankedWins: 1.3,
      matchResume: 1,
      national: 1.3,
      state: 0.2,
      duals: 0.8,
      rankWrestler: 1,
      nationalRanking: 1,
      collegeOpen: 0,
      profile: 0,
    })
    expect(WOMENS_EVENT_WEIGHTS).toEqual({ topTier: 1.6, nhsca: 1, qualifier: 1.2, nhscaAllAmerican: 0.7 })
    expect(WOMENS_QUALIFIERS_COUNTED).toBe(3)
  })

  it("treats Spokane and the US Open as top tier, and nothing else from the open events", () => {
    expect(isWomensTopTierEvent("USAW Women's Nationals")).toBe(true)
    expect(isWomensTopTierEvent("US Open")).toBe(true)
    expect(isWomensTopTierEvent("U.S. Open Wrestling Championships")).toBe(true)
    expect(isWomensTopTierEvent("Journeymen Women's World Classic")).toBe(false)
    expect(isWomensTopTierEvent("Southeast Regional Championships")).toBe(false)
    expect(isWomensTopTierEvent("NC Freestyle & Greco State Championships")).toBe(false)
  })
})

describe("a girl's own national ranking", () => {
  it("scores her best current position, plus a little for each further outlet", () => {
    expect(womensNationalRankingPoints([])).toBe(0)
    // Rylynn Keziah: SI #6 at 170, MatScouts #12 at 170, MatScouts 2028 board #55.
    expect(
      womensNationalRankingPoints([
        { source: "sports_illustrated", scope: "weight", rank: 6 },
        { source: "matscouts", scope: "weight", rank: 12 },
        { source: "matscouts", scope: "big_board", rank: 55 },
      ]),
    ).toBe(53)
    // Khiry Reese: SI #17 at 125.
    expect(womensNationalRankingPoints([{ source: "sports_illustrated", scope: "weight", rank: 17 }])).toBe(26)
  })
})

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
      nationalRanking: 0,
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

describe("women's in-state freestyle pools (13 October 2026)", () => {
  it("knows the two round-robin events, and only those", () => {
    expect(isStatePoolEvent("NC Freestyle & Greco State Championships")).toBe(true)
    expect(isStatePoolEvent("2026 Tar Heel State Classic - Junior Girls Freestyle")).toBe(true)
    expect(isStatePoolEvent("Frank E. Rader Southeast Regional Championships")).toBe(false)
    expect(isStatePoolEvent("Journeymen Women's World Classic")).toBe(false)
  })

  it("pays for matches won there and never for the place, sixteen points at most", () => {
    // Champion of five, 4-0: four wins. The title itself scores nothing.
    expect(womensPoolEventPoints({ placement: 1, record: "4-0", entrants: 5 })).toBe(16)
    expect(womensPoolEventPoints({ placement: 4, record: "4-0", entrants: 5 })).toBe(16)
    // "2nd" of two, 1-2: one opponent, however many times they met.
    expect(womensPoolEventPoints({ placement: 2, record: "1-2", entrants: 2 })).toBe(4)
    expect(womensPoolEventPoints({ placement: 1, record: "3-0", entrants: 2 })).toBe(4)
    // Uncontested, or pool size unknown: she entered, nothing more.
    expect(womensPoolEventPoints({ placement: null, record: "", entrants: 1 })).toBe(0)
    expect(womensPoolEventPoints({ placement: 1, record: "2-0", entrants: null })).toBe(0)
  })

  it("stability: no single in-state pool event can be worth more than a national result", () => {
    // The most either event can add, at the qualifier weight. Loading one of them on 13 October
    // 2026 was worth up to 80 points and dropped an NHSCA All-American from 7th to 20th.
    const mostFromOnePool = Math.max(
      ...[2, 3, 4, 5, 8].flatMap((entrants) =>
        [1, 2, 3].map((placement) => womensPoolEventPoints({ placement, record: `${entrants}-0`, entrants })),
      ),
    ) * WOMENS_EVENT_WEIGHTS.qualifier
    expect(mostFromOnePool).toBeLessThanOrEqual(20)
    // Eight wins at Women's National Duals is worth more than any in-state pool.
    expect(womensNationalDualsPoints("8-2") * WOMENS_EVENT_WEIGHTS.qualifier).toBeGreaterThan(mostFromOnePool * 2)
  })
})

describe("Women's National Duals is scored by matches won (13 October 2026)", () => {
  it("counts wins against the national field, ten at most", () => {
    expect(isWomensNationalDuals("2026 Women's National Duals - Junior Girls Freestyle")).toBe(true)
    expect(isWomensNationalDuals("NHSCA National Duals")).toBe(false)
    expect(womensNationalDualsPoints("8-2")).toBe(40)
    expect(womensNationalDualsPoints("1-9")).toBe(5)
    expect(womensNationalDualsPoints("14-0")).toBe(50)
    expect(womensNationalDualsPoints(null)).toBe(0)
    // Forfeits are not wins: 7-0 with three forfeits is four matches won.
    expect(womensNationalDualsPoints("7-0", 4)).toBe(20)
  })
})

describe("the women's board ranks on the last twelve months (13 October 2026)", () => {
  const now = Date.parse("2026-10-13T12:00:00Z")
  it("counts her most recent trip to each event and nothing older", () => {
    expect(isInsideWomensWindow({ event: "Fargo FS", year: 2026 }, now)).toBe(true)
    expect(isInsideWomensWindow({ event: "NHSCA", year: 2026 }, now)).toBe(true)
    expect(isInsideWomensWindow({ event: "NCHSAA state", year: 2026 }, now)).toBe(true)
    expect(isInsideWomensWindow({ event: "Super32", year: 2025 }, now)).toBe(true)
    expect(isInsideWomensWindow({ event: "Fargo FS", year: 2025 }, now)).toBe(false)
    expect(isInsideWomensWindow({ event: "NHSCA", year: 2025 }, now)).toBe(false)
    expect(isInsideWomensWindow({ event: "NCHSAA state", year: 2025 }, now)).toBe(false)
    // A date on file wins over the guess from the year.
    expect(isInsideWomensWindow({ event: "Journeymen", year: 2025, date: "2025-10-04" }, now)).toBe(false)
    expect(isInsideWomensWindow({ event: "Journeymen", year: 2026, date: "2026-10-02" }, now)).toBe(true)
  })
})
