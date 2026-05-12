import { describe, expect, it } from "vitest"
import {
  barePlacementLooksLikeWinCountFromRecord,
  getCommitmentHonorBadgesForAthlete,
} from "./commitment-card-honors"

describe("commitment-card-honors", () => {
  it("does not award All-American when placement digit equals wins from W–L record (Super 32 style)", () => {
    const badges = getCommitmentHonorBadgesForAthlete({
      id: "t",
      name: "Test Wrestler",
      super_32_2025_placement: "1",
      super_32_2025_record: "1-2",
    })
    expect(badges).not.toContain("All-American")
  })

  it("does not award All-American when NHSCA placement matches wins from (W–L)", () => {
    const badges = getCommitmentHonorBadgesForAthlete({
      id: "t",
      name: "Test Wrestler",
      nhsca_2025_placement: "4",
      nhsca_2025_record: "(4-2)",
    })
    expect(badges).not.toContain("All-American")
  })

  it("still awards All-American for real top-8 numeric placement when record wins disagree", () => {
    const badges = getCommitmentHonorBadgesForAthlete({
      id: "t",
      name: "Test Wrestler",
      nhsca_2025_placement: "3",
      nhsca_2025_record: "5-2",
    })
    expect(badges).toContain("All-American")
  })

  it("barePlacementLooksLikeWinCountFromRecord handles wrapped record", () => {
    expect(barePlacementLooksLikeWinCountFromRecord("4", "(4-2)")).toBe(true)
    expect(barePlacementLooksLikeWinCountFromRecord("3", "5-2")).toBe(false)
  })

  it("achievements text never adds All-American (state honors only from prose)", () => {
    const badges = getCommitmentHonorBadgesForAthlete({
      id: "t",
      name: "Test Wrestler",
      achievements: ["NHSCA All-American 2025", "won states"],
      additional_achievements: [],
    })
    expect(badges).not.toContain("All-American")
  })

  it("RankWrestler 'All American' in achievements does not add NHSCA/Super32 All-American chip", () => {
    const badges = getCommitmentHonorBadgesForAthlete({
      id: "68df5d96-e4c3-4f1b-b1aa-4a09046cb763",
      name: "James Campos",
      achievements: [
        "FR DNP",
        "SO 2nd 1A states 132",
        "JR 3rd 3A states 132",
        "SR  1st 6A states 144",
        "X2 RankWrestler All American",
      ],
      additional_achievements: "",
    })
    expect(badges).not.toContain("All-American")
  })
})
