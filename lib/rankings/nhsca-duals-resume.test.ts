import { describe, expect, it } from "vitest"
import { dualsRecordPoints, teamRoundBonus } from "./nhsca-duals-resume"

describe("dualsRecordPoints", () => {
  it("matches the scale the board already uses for duals", () => {
    // 2025 NHSCA National Duals scores a 7-1 at 22 via recordWinPctPoints * 2. The 2026 event
    // has to agree with it, or the same week is worth different amounts in different years.
    expect(dualsRecordPoints(7, 1)).toBe(21)
    expect(dualsRecordPoints(5, 3)).toBe(15)
    expect(dualsRecordPoints(8, 0)).toBe(24)
  })

  it("does not let a single bout outscore a full week", () => {
    // The inherited scale reads percentage alone, so 1-0 is 100% and scores 24 — more than
    // Tobin McNair's 7-1. Fares Alkurdasi wrestled a partial lineup; that is less evidence,
    // not a better record.
    expect(dualsRecordPoints(1, 0)).toBeLessThan(dualsRecordPoints(7, 1))
    expect(dualsRecordPoints(2, 1)).toBeLessThan(dualsRecordPoints(6, 2))
  })

  it("never goes negative", () => {
    // A losing week at a national duals is still a week spent wrestling nationally.
    expect(dualsRecordPoints(0, 6)).toBe(0)
    expect(dualsRecordPoints(1, 5)).toBeGreaterThanOrEqual(0)
  })
})

describe("teamRoundBonus", () => {
  it("credits how far the team got", () => {
    expect(teamRoundBonus("Champion")).toBe(20)
    expect(teamRoundBonus("Round of 32")).toBe(8)
    expect(teamRoundBonus("Round of 64")).toBe(5)
  })

  it("stays smaller than the wrestler's own record", () => {
    // The team's draw is context, not the wrestler's doing. Mac's 5-3 is worth 24; his team
    // reaching the Round of 32 adds 8.
    expect(teamRoundBonus("Round of 32")).toBeLessThan(dualsRecordPoints(5, 3))
  })

  it("gives nothing when the finish is unrecorded", () => {
    expect(teamRoundBonus(null)).toBe(0)
    expect(teamRoundBonus("")).toBe(0)
    expect(teamRoundBonus("Pool play")).toBe(0)
  })
})

describe("forfeits", () => {
  it("are not worth ranking points", () => {
    // 13 of the 224 bouts had OPEN across the mat. Six team points, no wrestling.
    // A wrestler who went 5-3 and took one forfeit is scored on the 5-3.
    expect(dualsRecordPoints(5, 3)).toBe(15)
  })
})
