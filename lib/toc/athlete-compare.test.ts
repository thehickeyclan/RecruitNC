import { describe, expect, it } from "vitest"
import {
  findHeadToHeadMatches,
  placementPoints,
  recordWinPctPoints,
} from "@/lib/toc/athlete-compare"

describe("placementPoints", () => {
  it("scores state/NHSCA placers", () => {
    expect(placementPoints(1)).toBe(40)
    expect(placementPoints(4)).toBe(18)
    expect(placementPoints(8)).toBe(6)
    expect(placementPoints(null)).toBe(0)
  })
})

describe("recordWinPctPoints", () => {
  it("rewards winning records", () => {
    expect(recordWinPctPoints("4-2")).toBeGreaterThan(recordWinPctPoints("2-4"))
  })
})

describe("findHeadToHeadMatches", () => {
  it("finds wins over the opponent by name", () => {
    const matches = findHeadToHeadMatches(
      [
        {
          opponent_name: "Liam Hickey",
          win_loss: "W",
          tournament: "Super32",
          weight: "126",
        },
        {
          opponent_name: "Someone Else",
          win_loss: "W",
        },
      ],
      "Tyler Tracy",
      "Liam Hickey",
    )
    expect(matches).toHaveLength(1)
    expect(matches[0]?.winnerSide).toBe("a")
  })
})
