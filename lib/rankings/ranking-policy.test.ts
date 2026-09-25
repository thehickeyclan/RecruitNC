/**
 * What the ranking promises, as opposed to what it currently computes.
 *
 * The other test files check arithmetic, and four of them had to be rewritten in a single
 * afternoon because the arithmetic changed for good reasons. These do not check any number that
 * a reviewer might reasonably want to re-tune. They check the rules the model is *for* — the
 * ones that, if they broke, would make a ranking indefensible to the family of the wrestler it
 * ranks below.
 *
 * Each one exists because it was broken in production, and most were found by somebody reading
 * a card rather than by a test.
 */
import { describe, expect, it } from "vitest"
import { placementPoints, recordWinPctPoints } from "@/lib/toc/athlete-compare"
import { isUpsetLoss } from "./recruitnc-ranking-engine"
import { isRosterLimitedWindow, MAX_WINDOW_PENALTY, missedWindowsFor, type ClassWindow } from "./missed-window"
import { dualsRecordPoints, teamRoundBonus } from "./nhsca-duals-resume"
import { rankedWinValue, scoreRankedWins } from "./ranked-win-value"
import { isYouthDivisionEntry } from "@/lib/nhsca-national-duals-import"

/** A Tournament of Champions title, the best single thing on any of these résumés. */
const TOC_TITLE = placementPoints(1) + recordWinPctPoints("3-0")

const window = (label: string, participation: number): ClassWindow => ({
  label,
  year: 2026,
  entrants: Math.round(participation * 100),
  classSize: 100,
  participation,
})

describe("a wrestler is never charged for something they could not choose", () => {
  it("does not penalise missing an event with a fixed roster", () => {
    // NHSCA Duals is twenty wrestlers, one per weight. A 152-pounder stays home because somebody
    // else had the weight — a coach's lineup decision, not a choice about their season.
    expect(isRosterLimitedWindow("NHSCA Duals 2026")).toBe(true)
    expect(isRosterLimitedWindow("NHSCA National Duals 2026")).toBe(true)
    expect(isRosterLimitedWindow("I-64 Spring Duals 2026")).toBe(true)
  })

  it("still penalises missing an event anybody can enter", () => {
    expect(isRosterLimitedWindow("Super 32 Early Entry 2026")).toBe(false)
    expect(isRosterLimitedWindow("NHSCA Nationals 2026")).toBe(false)
    expect(isRosterLimitedWindow("Tournament of Champions 2026")).toBe(false)
  })
})

describe("an absence is weaker evidence than a performance", () => {
  it("never lets missing events outweigh winning the deepest field in the state", () => {
    // Penalties stacked per event and reached 64 against a title worth 52, which made not
    // competing the largest single force on the board.
    const everything = missedWindowsFor(new Set<string>(), [
      window("Super 32 Early Entry 2026", 0.9),
      window("NHSCA Nationals 2025", 0.8),
      window("Tournament of Champions 2026", 0.7),
      window("NHSCA Nationals 2026", 0.6),
    ])
    const total = everything.reduce((sum, w) => sum + w.penalty, 0)
    expect(total).toBeLessThanOrEqual(MAX_WINDOW_PENALTY)
    expect(total).toBeLessThan(TOC_TITLE)
  })

  it("prices one quiet season the same however many windows a class happens to have", () => {
    // Four windows cleared the floor in the Class of 2028 and one in 2029. The same wrestler
    // cannot be charged three times as much for being in the smaller class.
    const many = missedWindowsFor(new Set<string>(), [
      window("a 2026", 0.9), window("b 2026", 0.8), window("c 2026", 0.7), window("d 2026", 0.6),
    ]).reduce((s, w) => s + w.penalty, 0)
    const one = missedWindowsFor(new Set<string>(), [window("a 2026", 0.9)]).reduce((s, w) => s + w.penalty, 0)
    expect(many).toBeLessThanOrEqual(MAX_WINDOW_PENALTY)
    expect(many - one).toBeLessThan(MAX_WINDOW_PENALTY / 2)
  })
})

describe("who you beat decides what a win is worth", () => {
  it("pays more for beating a better wrestler, whatever the event was called", () => {
    // The scorer read the event first, so beating the #2 in a class scored exactly what beating
    // a wrestler who went 0-2 at the same tournament scored.
    expect(rankedWinValue({ reason: "toc-field", opponentRanking: 2 }))
      .toBeGreaterThan(rankedWinValue({ reason: "toc-field", opponentRanking: null }))
    expect(rankedWinValue({ reason: "ranked", opponentRanking: 2 }))
      .toBeGreaterThan(rankedWinValue({ reason: "ranked", opponentRanking: 40 }))
  })

  it("values the same opponent the same in any bracket they appear in", () => {
    expect(rankedWinValue({ reason: "toc-field", opponentRanking: 5 }))
      .toBe(rankedWinValue({ reason: "ranked", opponentRanking: 5 }))
  })

  it("rewards the better win set when both are the same size", () => {
    /*
     * Volume counts too and should: five wins over ranked opposition is a bigger season than two.
     * What must never happen is two win sets of equal length scoring alike because the opponents
     * were not read — so this holds the count fixed and varies only who was beaten.
     */
    const quality = [
      { reason: "toc-field" as const, opponentRanking: 2 },
      { reason: "ranked" as const, opponentRanking: 4 },
      { reason: "toc-field" as const, opponentRanking: 9 },
    ]
    const padding = [
      { reason: "toc-field" as const, opponentRanking: null },
      { reason: "toc-field" as const, opponentRanking: null },
      { reason: "ranked" as const, opponentRanking: 48 },
    ]
    expect(scoreRankedWins(quality)).toBeGreaterThan(scoreRankedWins(padding))
  })
})

describe("a result has to have been wrestled", () => {
  it("gives nothing for a bout nobody turned up to", () => {
    // Thirteen of the 224 duals bouts were forfeits — six team points, no wrestling.
    expect(dualsRecordPoints(0, 0)).toBe(0)
  })

  it("does not let one bout outscore a full week of them", () => {
    expect(dualsRecordPoints(1, 0)).toBeLessThan(dualsRecordPoints(7, 1))
  })

  it("keeps a team's draw smaller than the wrestler's own record", () => {
    expect(teamRoundBonus("Champion")).toBeLessThan(dualsRecordPoints(7, 1) + teamRoundBonus("Champion"))
    expect(teamRoundBonus("Round of 32")).toBeLessThan(dualsRecordPoints(5, 3))
  })
})

describe("a losing result is never hidden", () => {
  it("shows a loss to somebody ranked below them, wherever it happened", () => {
    // Every loss at the TOC was exempt because the check read the event instead of the ranking —
    // and the TOC is the one event where a class wrestles each other.
    expect(isUpsetLoss({ reason: "toc-field", opponentRanking: 18, opponentGraduationYear: 2027 }, 10, 2027)).toBe(true)
    expect(isUpsetLoss({ reason: "ranked", opponentRanking: 18, opponentGraduationYear: 2027 }, 10, 2027)).toBe(true)
  })

  it("never compares two wrestlers from different classes", () => {
    // Rankings are per graduation year; "#118" in a graduated class says nothing about a junior.
    expect(isUpsetLoss({ reason: "ranked", opponentRanking: 118, opponentGraduationYear: 2026 }, 10, 2027)).toBe(false)
  })
})

describe("the board is for high school recruiting", () => {
  it("never imports an elementary or middle school result", () => {
    expect(isYouthDivisionEntry("Kraken - EL")).toBe(true)
    expect(isYouthDivisionEntry("Revival Jokers - MS")).toBe(true)
    expect(isYouthDivisionEntry("Trinity Top Team - HSB")).toBe(false)
    expect(isYouthDivisionEntry("Valebound Wrestling Club - HSG")).toBe(false)
  })
})
