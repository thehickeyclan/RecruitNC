import { describe, expect, it } from "vitest"
import { getCuratedSignificantWins } from "./curated-significant-wins"

describe("getCuratedSignificantWins", () => {
  it("includes Jacob Perry's two credentialed Georgia wins", () => {
    const wins = getCuratedSignificantWins("ddea34af-ae6a-4880-8a1c-687576bef1fe")
    expect(wins.map((win) => win.opponent)).toEqual(["Jin Davis", "Braelyn Nelson"])
    expect(wins[0]?.credential).toContain("GA State Champion")
    expect(wins[1]?.credential).toContain("GA State Runner-up")
  })
})
