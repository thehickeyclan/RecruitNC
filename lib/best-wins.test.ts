import { describe, expect, it } from "vitest"
import { bestWins, bestWinTier } from "./best-wins"

describe("bestWins", () => {
  const w = (opponent: string, reason: string, date: string, extra: Record<string, unknown> = {}) => ({ opponent, reason, date, ...extra })

  it("orders by level, then newest first", () => {
    const list = [
      w("placer old", "state-placer", "2025-12-01"),
      w("aa", "national-placer", "2026-03-26"),
      w("champ", "state-champion", "2026-02-19"),
      w("placer new", "state-placer", "2026-09-05"),
      w("nat", "national-ranked", "2025-11-01"),
    ]
    expect(bestWins(list).map((x) => x.opponent)).toEqual(["nat", "champ", "aa"])
  })

  it("counts a ranked opponent who won state as a state champion", () => {
    expect(bestWinTier(w("x", "ranked", "2026-01-01", { stateFinish: "champion" }))).toBe(1)
  })

  it("never headlines a win only the family vouches for, but does once the placing is confirmed", () => {
    expect(bestWinTier(w("typed", "credentialed", "2026-10-11", { source: "athlete-reported" }))).toBeNull()
    expect(bestWinTier(w("Jack Yetzer", "state-champion", "2025-10-11", { source: "athlete-reported" }))).toBe(1)
  })

  it("reads US dates as the profile stores them", () => {
    const list = [w("older", "state-placer", "2026-01-02"), w("newer", "state-placer", "2/14/2026")]
    expect(bestWins(list, 1)[0]!.opponent).toBe("newer")
  })
})
