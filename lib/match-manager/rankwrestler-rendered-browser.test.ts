import { describe, expect, it } from "vitest"
import { rankWrestlerSeasonUrl } from "./rankwrestler-rendered-browser"

describe("rankWrestlerSeasonUrl", () => {
  it("maps season-tab labels to RankWrestler's season query parameter", () => {
    expect(
      rankWrestlerSeasonUrl("https://www.rankwrestlers.com/wrestler/35011968132?season=2025", "2024-25 Season"),
    ).toBe("https://www.rankwrestlers.com/wrestler/35011968132?season=2024")
  })

  it("handles early preseason labels", () => {
    expect(
      rankWrestlerSeasonUrl("https://www.rankwrestlers.com/wrestler/35011968132", "2026-27 Early Preseason"),
    ).toBe("https://www.rankwrestlers.com/wrestler/35011968132?season=2026")
  })

  it("does not create a URL for a control without a season year", () => {
    expect(rankWrestlerSeasonUrl("https://www.rankwrestlers.com/wrestler/35011968132", "Previous season")).toBeNull()
  })
})
