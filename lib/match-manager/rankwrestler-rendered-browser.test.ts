import { describe, expect, it } from "vitest"
import { historicalSeasonLabelsFromCurrent, rankWrestlerSeasonUrl } from "./rankwrestler-rendered-browser"

describe("rankWrestlerSeasonUrl", () => {
  it("maps season-tab labels to RankWrestler's season query parameter", () => {
    expect(
      rankWrestlerSeasonUrl("https://www.rankwrestlers.com/wrestler/35011968132?season=2025", "2024-25 Season"),
    ).toBe("https://www.rankwrestlers.com/wrestler/35011968132?season=2024")
  })

  it("does not sync early preseason labels as match-history seasons", () => {
    expect(rankWrestlerSeasonUrl("https://www.rankwrestlers.com/wrestler/35011968132", "2026-27 Early Preseason")).toBeNull()
  })

  it("does not create a URL for a control without a season year", () => {
    expect(rankWrestlerSeasonUrl("https://www.rankwrestlers.com/wrestler/35011968132", "Previous season")).toBeNull()
  })
})

describe("historicalSeasonLabelsFromCurrent", () => {
  it("creates a four-year high-school season window from the rendered current season", () => {
    expect(historicalSeasonLabelsFromCurrent("2025-26")).toEqual(["2025-26", "2024-25", "2023-24", "2022-23"])
  })
})
