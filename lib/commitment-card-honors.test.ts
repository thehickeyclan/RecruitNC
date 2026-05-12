import { describe, expect, it } from "vitest"
import type { NchsaaHonorRowInput } from "./commitment-card-honors"
import {
  barePlacementLooksLikeWinCountFromRecord,
  getCommitmentHonorBadgesForAthlete,
  mergeCommitmentHonorBadgesForDisplay,
  stateHonorsFromNchsaaMergedRows,
} from "./commitment-card-honors"

/**
 * Same pipeline as `ProfessionalCommitmentCard`: profile `getCommitmentHonorBadgesForAthlete` +
 * `/api/wrestling-achievements`-shaped payload → `mergeCommitmentHonorBadgesForDisplay`.
 */
function commitmentCardHonorBadgesE2E(
  athlete: Record<string, unknown>,
  achievementsPayload: {
    state_championships?: unknown[]
    all_results?: { nchsaa?: NchsaaHonorRowInput[] }
  },
): string[] {
  const honorBadges = getCommitmentHonorBadgesForAthlete(athlete)
  const found = new Set(stateHonorsFromNchsaaMergedRows(achievementsPayload.all_results?.nchsaa ?? []))
  if (Array.isArray(achievementsPayload.state_championships) && achievementsPayload.state_championships.length > 0) {
    found.add("State Champion")
  }
  const serverStateHonors = (["State Champion", "State Placer", "State Qualifier"] as const).filter((b) => found.has(b))
  return mergeCommitmentHonorBadgesForDisplay(honorBadges, [...serverStateHonors])
}

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

  it("NCHSAA + 1st / first place in achievements is State Champion, not placer-only", () => {
    const badges = getCommitmentHonorBadgesForAthlete({
      id: "t",
      name: "Lydia Alley",
      achievements: ["2026 NCHSAA Girls 132 — 1st place", "North Davidson"],
    })
    expect(badges).toContain("State Champion")
    expect(badges).not.toContain("State Placer")
    expect(badges).not.toContain("State Qualifier")
  })

  it("getCommitmentHonorBadgesForAthlete: state champion drops state qualifier from same profile", () => {
    const badges = getCommitmentHonorBadgesForAthlete({
      id: "t",
      name: "Test",
      achievements: ["2026 NCHSAA 132 — 1st place", "State Qualifier"],
    })
    expect(badges).toContain("State Champion")
    expect(badges).not.toContain("State Qualifier")
  })

  it("mergeCommitmentHonorBadgesForDisplay: API SQ + profile State Champion → no qualifier chip", () => {
    const merged = mergeCommitmentHonorBadgesForDisplay(["State Champion"], ["State Qualifier"])
    expect(merged).toContain("State Champion")
    expect(merged).not.toContain("State Qualifier")
  })

  it("mergeCommitmentHonorBadgesForDisplay: State Placer drops SQ", () => {
    const merged = mergeCommitmentHonorBadgesForDisplay([], ["State Placer", "State Qualifier"])
    expect(merged).toContain("State Placer")
    expect(merged).not.toContain("State Qualifier")
  })

  it("E2E card pipeline: API only SQ rows + profile says NCHSAA 1st → State Champion, not State Qualifier", () => {
    const athlete = {
      id: "e2e-lydia",
      name: "Lydia Alley",
      achievements: ["2026 NCHSAA Girls 132 — 1st place", "North Davidson"],
    }
    const api = {
      state_championships: [] as unknown[],
      all_results: {
        nchsaa: [
          { year: 2026, classification: "A", weight_class: "132", place: 0 },
          { year: 2026, classification: "", weight_class: "", place: 0 },
        ],
      },
    }
    const chips = commitmentCardHonorBadgesE2E(athlete, api)
    expect(chips).toContain("State Champion")
    expect(chips).not.toContain("State Qualifier")
  })

  it("E2E card pipeline: API only SQ + profile nchsaa_results JSON place 1 → State Champion, not State Qualifier", () => {
    const athlete = {
      id: "e2e-json-champ",
      name: "Example Athlete",
      achievements: [],
      nchsaa_results: [{ year: 2026, classification: "A", weight_class: "132", place: 1 }],
    }
    const api = {
      state_championships: [] as unknown[],
      all_results: {
        nchsaa: [{ year: 2026, weight_class: "132", place: 0 }],
      },
    }
    const chips = commitmentCardHonorBadgesE2E(athlete, api)
    expect(chips).toContain("State Champion")
    expect(chips).not.toContain("State Qualifier")
  })

  it("E2E card pipeline: API has champ row + duplicate SQ same year → State Champion, not State Qualifier", () => {
    const athlete = {
      id: "e2e-api-champ",
      name: "Example Athlete",
      achievements: [],
    }
    const api = {
      state_championships: [{ year: 2026, place: 1 }],
      all_results: {
        nchsaa: [
          { year: 2026, weight_class: "132", place: 0 },
          { year: 2026, weight_class: "132", place: 1 },
        ],
      },
    }
    const chips = commitmentCardHonorBadgesE2E(athlete, api)
    expect(chips).toContain("State Champion")
    expect(chips).not.toContain("State Qualifier")
  })

  it("mergeCommitmentHonorBadgesForDisplay: champ only in additional_achievements + API SQ → State Champion", () => {
    const profileHonors = getCommitmentHonorBadgesForAthlete({
      id: "x",
      name: "Lydia Alley",
      achievements: [],
      additional_achievements: ["2026 NCHSAA Girls 132 — 1st place"],
    })
    const serverState = stateHonorsFromNchsaaMergedRows([{ year: 2026, classification: "A", weight_class: "132", place: 0 }])
    expect(serverState).toContain("State Qualifier")
    const merged = mergeCommitmentHonorBadgesForDisplay(profileHonors, serverState)
    expect(merged).toContain("State Champion")
    expect(merged).not.toContain("State Qualifier")
  })

  it("stateHonorsFromNchsaaMergedRows: SQ + champ same year/weight (classification mismatch) → champion only", () => {
    expect(
      stateHonorsFromNchsaaMergedRows([
        { year: 2026, classification: "", weight_class: "132", place: 0 },
        { year: 2026, classification: "A", weight_class: "132", place: 1 },
      ]),
    ).toEqual(["State Champion"])
  })

  it("stateHonorsFromNchsaaMergedRows: SQ + 3rd same year/weight → placer only", () => {
    expect(
      stateHonorsFromNchsaaMergedRows([
        { year: 2026, weight_class: "132", place: 0 },
        { year: 2026, weight_class: "132", place: 3 },
      ]),
    ).toEqual(["State Placer"])
  })

  it("stateHonorsFromNchsaaMergedRows: SQ only different year keeps qualifier", () => {
    expect(
      stateHonorsFromNchsaaMergedRows([
        { year: 2025, weight_class: "132", place: 0 },
        { year: 2026, weight_class: "132", place: 0 },
      ]),
    ).toEqual(["State Qualifier"])
  })

  it("stateHonorsFromNchsaaMergedRows: SQ same year, empty weight + champ at 132 → champion only", () => {
    expect(
      stateHonorsFromNchsaaMergedRows([
        { year: 2026, classification: "A", weight_class: "", place: 0 },
        { year: 2026, classification: "A", weight_class: "132", place: 1 },
      ]),
    ).toEqual(["State Champion"])
  })

  it("stateHonorsFromNchsaaMergedRows: 2025 SQ + 2026 champ → both badges", () => {
    expect(
      stateHonorsFromNchsaaMergedRows([
        { year: 2025, weight_class: "126", place: 0 },
        { year: 2026, weight_class: "132", place: 1 },
      ]),
    ).toEqual(["State Champion", "State Qualifier"])
  })

  it("stateHonorsFromNchsaaMergedRows: normalizes 132 lbs", () => {
    expect(
      stateHonorsFromNchsaaMergedRows([
        { year: 2026, weight_class: "132 lbs", place: 0 },
        { year: 2026, weight_class: "132", place: 1 },
      ]),
    ).toEqual(["State Champion"])
  })
})
