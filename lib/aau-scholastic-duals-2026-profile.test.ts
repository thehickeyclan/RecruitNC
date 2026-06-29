import { describe, expect, it } from "vitest"
import {
  AAU_SCHOLASTIC_DUALS_EVENT_LABEL,
  getAauScholasticDuals2026ProfileHighlightVideoSrcs,
  getAauScholasticDuals2026ProfileQualityWins,
  getAauScholasticDuals2026ProfileResults,
  resolveAauScholasticRosterNameForProfile,
} from "@/lib/aau-scholastic-duals-2026-profile"
import { AAU_SCHOLASTIC_DUALS_2026_PROFILE_OVERRIDES } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"
import { AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS } from "@/lib/aau-scholastic-duals-2026-results"
import { AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS } from "@/lib/aau-scholastic-duals-2026-quality-wins"
import { AAU_SCHOLASTIC_DUALS_2026_WRESTLER_CARDS } from "@/lib/aau-scholastic-duals-2026-wrestler-cards"
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

  it("includes AAU highlight reel for Luke Padgett", () => {
    const highlights = getNationalTeamProfileHighlights("any-id", ["Luke Padgett"])
    expect(highlights.some((h) => h.event === AAU_SCHOLASTIC_DUALS_EVENT_LABEL)).toBe(true)
    expect(highlights.some((h) => h.videoSrc.includes("luke-padgett-highlight"))).toBe(true)
  })

  it("includes both AAU highlight reels for Jacob Perry on profile", () => {
    const highlights = getNationalTeamProfileHighlights("any-id", ["Jacob Perry"]).filter(
      (h) => h.event === AAU_SCHOLASTIC_DUALS_EVENT_LABEL
    )
    expect(highlights).toHaveLength(2)
    expect(highlights.every((h) => h.title === "Highlight Reel from AAU Scholastic Duals 2026")).toBe(true)
    expect(highlights.some((h) => h.videoSrc.includes("jacob-perry-highlight.mov"))).toBe(true)
    expect(highlights.some((h) => h.videoSrc.includes("jacob-perry-highlight-2.mov"))).toBe(true)
  })
})

const AAU_QUALITY_WIN_WRESTLERS = AAU_SCHOLASTIC_DUALS_2026_QUALITY_WINS.map((entry) => entry.wrestler)

describe("AAU Scholastic Duals 2026 profile coverage", () => {
  it("exposes individual records for every curated quality-win wrestler", () => {
    for (const wrestler of AAU_QUALITY_WIN_WRESTLERS) {
      const results = getAauScholasticDuals2026ProfileResults("any-id", [wrestler])
      expect(results, wrestler).toHaveLength(1)
      expect(results[0]?.event).toBe(AAU_SCHOLASTIC_DUALS_EVENT_LABEL)
      expect(results[0]?.year).toBe(2026)
      expect(results[0]?.isPlaceholder).toBe(false)
    }
  })

  it("exposes quality wins for every curated AAU roster wrestler", () => {
    for (const wrestler of AAU_QUALITY_WIN_WRESTLERS) {
      const entry = getAauScholasticDuals2026ProfileQualityWins("any-id", [wrestler])
      expect(entry, wrestler).not.toBeNull()
      expect(entry!.wrestler).toBe(wrestler)
      expect(entry!.wins.length).toBeGreaterThan(0)
      expect(entry!.wins.some((win) => win.resultLine)).toBe(true)
    }
  })

  it("exposes individual records for every published AAU individual result row", () => {
    for (const row of AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS) {
      const results = getAauScholasticDuals2026ProfileResults("any-id", [row.wrestler])
      expect(results, row.wrestler).toHaveLength(1)
      expect(results[0]?.record).toBe(`${row.wins}-${row.losses}`)
    }
  })

  it("maps profile override ids to roster wrestler names", () => {
    for (const [wrestler, athleteId] of Object.entries(AAU_SCHOLASTIC_DUALS_2026_PROFILE_OVERRIDES)) {
      expect(resolveAauScholasticRosterNameForProfile(athleteId, ["Someone Else"])).toBe(wrestler)
      expect(getAauScholasticDuals2026ProfileQualityWins(athleteId, ["Someone Else"])).not.toBeNull()
    }
  })

  it("includes every configured AAU highlight reel on the matching profile", () => {
    for (const card of AAU_SCHOLASTIC_DUALS_2026_WRESTLER_CARDS) {
      if (!card.highlightVideoSrc) continue
      const srcs = getAauScholasticDuals2026ProfileHighlightVideoSrcs("any-id", [card.wrestler])
      expect(srcs, card.wrestler).toContain(card.highlightVideoSrc)
      const highlights = getNationalTeamProfileHighlights("any-id", [card.wrestler]).filter(
        (h) => h.event === AAU_SCHOLASTIC_DUALS_EVENT_LABEL,
      )
      expect(highlights.some((h) => h.videoSrc === card.highlightVideoSrc), card.wrestler).toBe(true)
    }
  })
})
