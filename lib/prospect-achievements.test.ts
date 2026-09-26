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
