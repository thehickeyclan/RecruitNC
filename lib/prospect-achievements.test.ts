import { describe, expect, it } from "vitest"
import { highestAchievement } from "./prospect-achievements"

describe("highestAchievement", () => {
  it("puts a national podium above a state title", () => {
    expect(highestAchievement({ bestNhscaPlace: 8, bestStatePlace: 1 }).level).toBe("all-american")
    expect(highestAchievement({ bestSuper32Place: 5, bestStatePlace: 1 }).level).toBe("all-american")
  })

  it("does not call a ninth-place finish All-American", () => {
    expect(highestAchievement({ bestNhscaPlace: 9 }).level).toBe("dnq")
  })

  it("finds a state champion", () => {
    // The old code read `prospect.state_results`, a column that does not exist, so this always
    // came back empty and the filter returned two wrestlers out of 261.
    expect(highestAchievement({ bestStatePlace: 1 }).level).toBe("state-champion")
  })

  it("separates a placer from a qualifier", () => {
    expect(highestAchievement({ bestStatePlace: 3 }).level).toBe("state-placer")
    expect(highestAchievement({ bestStatePlace: 6 }).level).toBe("state-placer")
    expect(highestAchievement({ bestStatePlace: 7 }).level).toBe("state-qualifier")
  })

  it("counts being at states as qualifying, placed or not", () => {
    expect(highestAchievement({ stateQualifier: true }).level).toBe("state-qualifier")
  })

  it("says nothing it cannot support", () => {
    expect(highestAchievement({}).level).toBe("dnq")
    expect(highestAchievement({ bestStatePlace: null, bestNhscaPlace: null }).level).toBe("dnq")
  })
})

import { aaEventLabel, placementFromRounds } from "./prospect-achievements"
describe("national All-American events", () => {
  it("counts the events Matt named, boys and girls, and not the qualifiers", () => {
    for (const k of ["super32-2025", "fargo-2025-16u-fs", "nhsca-nationals-2026", "ironman-2025", "ironman-women-2025", "powerade-2025", "beast-of-the-east-2025", "national-preps-2025", "national-preps-girls-2025", "usaw-womens-nationals-2025-u17-women-s-freestyle"]) expect(aaEventLabel(k)).not.toBeNull()
    for (const k of ["super32-early-entry-2025", "usaw-womens-nationals-2025-u15-women-s-freestyle", "journeymen-fall-classic-2025", "girls-wrestling-committee-states-2026"]) expect(aaEventLabel(k)).toBeNull()
  })
  it("reads the finish from the placement match", () => {
    expect(placementFromRounds([{ round: "7th Place Match", win: false, is_bye: false }])).toBe(8)
    expect(placementFromRounds([{ round: "1st Place Match", win: true, is_bye: false }])).toBe(1)
    expect(placementFromRounds([{ round: "Quarterfinal", win: true, is_bye: false }])).toBe(null)
  })
})
