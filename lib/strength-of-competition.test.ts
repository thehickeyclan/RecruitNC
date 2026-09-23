import { describe, expect, it } from "vitest"
import {
  buildStrengthOfCompetition,
  countRankedWins,
  isTeamBlindEvent,
  strengthOfCompetitionFacts,
} from "./strength-of-competition"

const win = (reason: string) => ({ reason })

describe("isTeamBlindEvent", () => {
  it("counts the events we ingest for every NC wrestler", () => {
    expect(isTeamBlindEvent("NHSCA Nationals")).toBe(true)
    expect(isTeamBlindEvent("Super 32 Early Entry")).toBe(true)
    expect(isTeamBlindEvent("I-64 Spring Duals")).toBe(true)
    expect(isTeamBlindEvent("Tournament of Champions")).toBe(true)
  })

  it("excludes the events we only hold for our own squads", () => {
    // NHSCA Duals and AAU are ingested from NC United registrations. Counting them would rank
    // our own athletes above identical wrestlers who travelled with another program.
    expect(isTeamBlindEvent("NHSCA Duals")).toBe(false)
    expect(isTeamBlindEvent("NHSCA Duals (Select)")).toBe(false)
    expect(isTeamBlindEvent("AAU Scholastic Duals")).toBe(false)
  })

  it("does not confuse NHSCA Duals with NHSCA Nationals", () => {
    expect(isTeamBlindEvent("NHSCA Nationals")).toBe(true)
    expect(isTeamBlindEvent("NHSCA Duals")).toBe(false)
  })
})

describe("countRankedWins", () => {
  it("splits wins by the credential the opponent carried", () => {
    const counts = countRankedWins([
      win("national-ranked"),
      win("toc-field"),
      win("toc-field"),
      win("ranked"),
    ])
    expect(counts).toEqual({ national: 1, tocField: 2, stateRanked: 1, total: 4 })
  })
})

describe("buildStrengthOfCompetition", () => {
  const base = {
    significantWins: [win("toc-field"), win("ranked")],
    significantLosses: [{}, {}, {}],
    results: [
      { event: "Tournament of Champions", year: 2026 },
      { event: "NHSCA Duals (Select)", year: 2026 },
      { event: "NCHSAA States", year: 2025 },
    ],
    season: null,
    seasonLabel: "2025-26",
    seasonsOnFile: 1,
  }

  it("separates team-blind events from our own squad entries", () => {
    const s = buildStrengthOfCompetition(base)
    expect(s.nationalEvents).toEqual(["Tournament of Champions"])
    expect(s.teamEvents).toEqual(["NHSCA Duals (Select)"])
  })

  it("records the earliest year so every count has a denominator", () => {
    expect(buildStrengthOfCompetition(base).recordsBeginYear).toBe(2025)
  })
})

describe("strengthOfCompetitionFacts", () => {
  const build = (seasonsOnFile: number) =>
    strengthOfCompetitionFacts(
      buildStrengthOfCompetition({
        significantWins: [win("national-ranked"), win("toc-field")],
        significantLosses: [{}],
        results: [
          { event: "NHSCA Nationals", year: 2026 },
          { event: "AAU Scholastic Duals", year: 2026 },
        ],
        season: null,
        seasonLabel: "2025-26",
        seasonsOnFile,
      }),
    )

  it("counts the wins by credential", () => {
    expect(build(3)[0]).toBe(
      "Ranked wins: 1 over nationally ranked opponents, 1 over Tournament of Champions field opponents.",
    )
  })

  it("says plainly that a team event's absence means nothing", () => {
    expect(build(3).join(" ")).toContain("their absence on another wrestler means nothing")
  })

  it("warns when the record is a single season", () => {
    // Abdul-Jamil Zaggout moved from New York and has one season with us. Without this, his
    // panel reads as a wrestler who does not travel.
    expect(build(1).join(" ")).toContain("transferred in or is in their first year")
    expect(build(3).join(" ")).not.toContain("transferred in")
  })
})
