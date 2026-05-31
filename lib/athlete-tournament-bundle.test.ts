import { describe, expect, it } from "vitest"
import { mergeCuratedFourTimeNchsaaIfMatch } from "@/lib/nchsaa-results"
import {
  countDistinctStateTitleYears,
  stateChampionBadgeLabel,
  stateChampionshipSummaryFromRows,
} from "@/lib/nchsaa-state-display"

describe("countDistinctStateTitleYears", () => {
  it("counts distinct years not duplicate rows", () => {
    const rows = [
      { year: 2026, place: 1 },
      { year: 2025, place: 1 },
      { year: 2025, place: 2 },
      { year: 2024, place: 1 },
    ]
    expect(countDistinctStateTitleYears(rows)).toBe(3)
  })
})

describe("stateChampionBadgeLabel", () => {
  it("allows 2–4x only", () => {
    expect(stateChampionBadgeLabel(1)).toBeNull()
    expect(stateChampionBadgeLabel(2)).toBe("2× State Champion")
    expect(stateChampionBadgeLabel(4)).toBe("4× State Champion")
    expect(stateChampionBadgeLabel(5)).toBeNull()
  })
})

describe("Bentley Sly golden state summary", () => {
  const partial = [
    { year: 2025, classification: "3A", weight_class: "144lbs", place: 1, school: "Stuart Cramer", wrestler_name: "Bentley Sly" },
    { year: 2024, classification: "3A", weight_class: "132lbs", place: 1, school: "Stuart Cramer", wrestler_name: "Bentley Sly" },
    { year: 2023, classification: "3A", weight_class: "120lbs", place: 1, school: "Stuart Cramer", wrestler_name: "Bentley Sly" },
  ]

  it("shows 4× after curated merge", () => {
    const merged = mergeCuratedFourTimeNchsaaIfMatch(partial, "Bentley Sly")
    expect(countDistinctStateTitleYears(merged)).toBe(4)
    expect(stateChampionshipSummaryFromRows(merged)).toBe("4× State Champion")
  })
})
