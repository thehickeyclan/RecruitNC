import { describe, expect, it } from "vitest"
import {
  AAU_SCHOLASTIC_DUALS_EVENT_LABEL,
  getAauScholasticDuals2026ProfileResults,
  resolveAauScholasticRosterNameForProfile,
} from "@/lib/aau-scholastic-duals-2026-profile"
import { getNationalTeamProfileHighlights } from "@/lib/national-team-profile-highlights"
import { mergeNationalTeamResultsForProfile } from "@/lib/national-team-live-profile-results"

describe("resolveAauScholasticRosterNameForProfile", () => {
  it("uses profile override pin for Xan Moody", () => {
    expect(
      resolveAauScholasticRosterNameForProfile("b3534262-2c69-426d-903d-da76433e361f", ["Alexander Moody"])
    ).toBe("Xan Moody")
  })

  it("matches Mac Johnson by name", () => {
    expect(resolveAauScholasticRosterNameForProfile("any-id", ["Mac Johnson"])).toBe("Mac Johnson")
  })
})

describe("getAauScholasticDuals2026ProfileResults", () => {
  it("returns published individual record for AAU roster wrestler", () => {
    expect(getAauScholasticDuals2026ProfileResults("any-id", ["Mac Johnson"])).toEqual([
      {
        event: AAU_SCHOLASTIC_DUALS_EVENT_LABEL,
        year: 2026,
        record: "12-0",
        isPlaceholder: false,
      },
    ])
  })

  it("returns empty for non-roster athlete", () => {
    expect(getAauScholasticDuals2026ProfileResults("any-id", ["Nobody Here"])).toEqual([])
  })
})

describe("mergeNationalTeamResultsForProfile AAU", () => {
  it("merges AAU Scholastic Duals row with other national team results", () => {
    const merged = mergeNationalTeamResultsForProfile({
      fromTable: [{ event: "Ultimate Club Duals", year: 2025, record: "7-2" }],
      fromAthleteRow: [],
      fromLive: [],
      fromRegistration: [],
      fromAau: [{ event: AAU_SCHOLASTIC_DUALS_EVENT_LABEL, year: 2026, record: "10-2", isPlaceholder: false }],
    })
    expect(merged).toHaveLength(2)
    expect(merged.some((r) => r.event === AAU_SCHOLASTIC_DUALS_EVENT_LABEL && r.record === "10-2")).toBe(true)
  })
})

describe("getNationalTeamProfileHighlights", () => {
  it("includes AAU highlight reel for Mac Johnson", () => {
    const highlights = getNationalTeamProfileHighlights("any-id", ["Mac Johnson"])
    expect(highlights.some((h) => h.event === AAU_SCHOLASTIC_DUALS_EVENT_LABEL)).toBe(true)
    expect(highlights.some((h) => h.videoSrc.includes("mac-johnson-highlight"))).toBe(true)
  })

  it("includes NHSCA highlight reel for Xan Moody via override id", () => {
    const highlights = getNationalTeamProfileHighlights("b3534262-2c69-426d-903d-da76433e361f", [
      "Alexander Moody",
    ])
    expect(highlights.some((h) => h.event === "NHSCA Duals")).toBe(true)
    expect(highlights.some((h) => h.videoSrc.includes("xan-moody-highlight"))).toBe(true)
  })
})
