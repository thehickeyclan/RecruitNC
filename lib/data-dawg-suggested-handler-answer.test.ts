import { describe, expect, it } from "vitest"
import { getRouteForSuggestedPrompt } from "@/lib/data-dawg-suggested-prompts"
import { formatSuggestedHandlerAnswer } from "@/lib/data-dawg-suggested-handler-answer"

describe("NHSCA school leaderboard suggested prompt", () => {
  it("routes the chip question to nhsca_school_leaderboard", () => {
    expect(getRouteForSuggestedPrompt("Which school has the most NHSCA All-Americans?")?.handler).toBe(
      "nhsca_school_leaderboard",
    )
  })

  it("formats a statewide leaderboard (not a North Carolina school miss)", () => {
    const text = formatSuggestedHandlerAnswer({
      aggregateResult: {
        type: "nhsca_school_leaderboard",
        schoolCounts: [
          { school: "Cardinal Gibbons", count: 42 },
          { school: "Green Hope", count: 30 },
        ],
      },
    })
    expect(text).toContain("Cardinal Gibbons")
    expect(text).toContain("most NHSCA All-Americans")
    expect(text?.toLowerCase()).not.toContain("no records")
  })

  it("routes default ranking and 4x chips", () => {
    expect(getRouteForSuggestedPrompt("Show me all Class of 2026 rankings")?.handler).toBe("prospect_rankings")
    expect(getRouteForSuggestedPrompt("Who are our 4x state champions?")?.handler).toBe("state_champion_records")
  })

  it("formats 4x state champion results", () => {
    const text = formatSuggestedHandlerAnswer({
      results: [
        {
          wrestler_name: "Test Champ",
          championships: [
            { year: 2020, classification: "4A", weight_class: "132" },
            { year: 2021, classification: "4A", weight_class: "138" },
            { year: 2022, classification: "4A", weight_class: "145" },
            { year: 2023, classification: "4A", weight_class: "152" },
          ],
        },
      ],
    })
    expect(text).toContain("4x State Champions")
    expect(text).toContain("Test Champ")
  })
})
