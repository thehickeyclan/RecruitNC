import { describe, expect, it } from "vitest"
import { isYouthDivisionEntry, resolveNhscaNationalDualsProfiles, type NhscaDirectoryAthlete } from "@/lib/nhsca-national-duals-import"
import type { ParsedAthleteResult } from "@/lib/other-tournament-import"

function entrant(name: string, club: string, weightClass = "120"): ParsedAthleteResult {
  return { athleteName: name, club, weightClass, wins: 5, losses: 1, byes: 0, record: "5-1", placement: null, qualified: false, entrants: 0, bouts: [] }
}

function profile(partial: Partial<NhscaDirectoryAthlete> = {}): NhscaDirectoryAthlete {
  return { id: "adam", name: "Adam Walker", graduationyear: 2029, gender: "Male", weightclass: "113", highschool: "Holly Springs", ...partial }
}

describe("NHSCA National Duals profile matching", () => {
  it("links Adam after exact identity, division, gender and weight checks", () => {
    const result = resolveNhscaNationalDualsProfiles([entrant("Adam Walker", "Prestige Worldwide - HSB")], [profile()], { eventYear: 2026 })
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]?.athlete.id).toBe("adam")
    expect(result.review).toHaveLength(0)
  })

  it("never reimports NC United team members", () => {
    const result = resolveNhscaNationalDualsProfiles([entrant("Adam Walker", "NC United - HSB")], [profile()], { eventYear: 2026 })
    expect(result.matches).toHaveLength(0)
    expect(result.review).toHaveLength(0)
  })

  it("leaves a nationwide same-name collision for review", () => {
    const result = resolveNhscaNationalDualsProfiles(
      [entrant("Adam Walker", "Prestige Worldwide - HSB")],
      [profile(), profile({ id: "other", highschool: "Another School" })],
      { eventYear: 2026 },
    )
    expect(result.matches).toHaveLength(0)
    expect(result.review[0]?.reason).toContain("multiple NC profiles")
  })

  it("rejects a wrong age division and a large weight mismatch", () => {
    // An elementary entrant is now dropped before matching rather than held for review: the
    // board does not rank elementary or middle school wrestlers, so there is nothing to review.
    const age = resolveNhscaNationalDualsProfiles([entrant("Adam Walker", "Youth Team - EL")], [profile()], { eventYear: 2026 })
    expect(age.matches).toHaveLength(0)
    expect(age.review).toHaveLength(0)
    const weight = resolveNhscaNationalDualsProfiles([entrant("Adam Walker", "Prestige Worldwide - HSB", "170")], [profile()], { eventYear: 2026 })
    expect(weight.review[0]?.reason).toContain("weights")
  })

  it("does not guess when the same source name appears on two high school teams", () => {
    const result = resolveNhscaNationalDualsProfiles(
      [entrant("Jacob Perry", "Trinity Top Team - HSB", "152"), entrant("Jacob Perry", "Kraken Black - HSB", "150")],
      [profile({ id: "jacob", name: "Jacob Perry", graduationyear: 2028, weightclass: 152 })],
      { eventYear: 2026 },
    )
    expect(result.matches).toHaveLength(0)
    expect(result.review[0]?.reason).toContain("multiple source teams")
  })

  it("no longer lets a middle school namesake withhold the high schooler", () => {
    /*
     * This is the case that prompted the change. The nationwide export carries a 100lb "Jacob
     * Perry" in the MS bracket and the class of 2028 Jacob Perry at 152; treating both as one
     * name put two teams under it and sent the real wrestler to review as a collision. Dropping
     * the youth division removes the ambiguity rather than asking somebody to settle it.
     */
    const result = resolveNhscaNationalDualsProfiles(
      [entrant("Jacob Perry", "Revival Jokers - MS", "100"), entrant("Jacob Perry", "Trinity Top Team - HSB", "152")],
      [profile({ id: "jacob", name: "Jacob Perry", graduationyear: 2028, weightclass: 152 })],
      { eventYear: 2026 },
    )
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0]?.athlete.id).toBe("jacob")
    expect(result.matches[0]?.source.club).toBe("Trinity Top Team - HSB")
    expect(result.review).toHaveLength(0)
  })
})

describe("isYouthDivisionEntry", () => {
  it("excludes elementary and middle school divisions", () => {
    expect(isYouthDivisionEntry("Kraken - EL")).toBe(true)
    expect(isYouthDivisionEntry("Revival Jokers - MS")).toBe(true)
    expect(isYouthDivisionEntry("CTWHALE Orca - MS")).toBe(true)
  })

  it("keeps the high school divisions", () => {
    expect(isYouthDivisionEntry("Trinity Top Team - HSB")).toBe(false)
    expect(isYouthDivisionEntry("Valebound Wrestling Club - HSG")).toBe(false)
    expect(isYouthDivisionEntry("Prestige Worldwide - HSB")).toBe(false)
  })

  it("keeps a team with no division suffix", () => {
    expect(isYouthDivisionEntry("NC United National Team")).toBe(false)
    expect(isYouthDivisionEntry("")).toBe(false)
    expect(isYouthDivisionEntry(null)).toBe(false)
  })
})

describe("resolveNhscaNationalDualsProfiles with youth divisions present", () => {
  it("drops youth entries and does not let a namesake block the high schooler", () => {
    const resolved = resolveNhscaNationalDualsProfiles(
      [
        entrant("Jacob Perry", "Revival Jokers - MS", "100"),
        entrant("Jacob Perry", "Trinity Top Team - HSB", "152"),
      ],
      [
        profile({ id: "hs", name: "Jacob Perry", graduationyear: 2028, weightclass: "157", highschool: "New Bern" }),
        profile({ id: "ms", name: "Jacob Perry", graduationyear: 2031, weightclass: "100", highschool: "Middle" }),
      ],
      { eventYear: 2026 },
    )

    // The middle school line is gone entirely. The high school one must also not be pushed to
    // review as a "same name on multiple source teams" collision by the line that was dropped.
    expect(resolved.matches.map((m) => m.source.club)).not.toContain("Revival Jokers - MS")
    expect(resolved.review.map((r) => r.team)).not.toContain("Revival Jokers - MS")
    expect(resolved.matches.map((m) => m.athlete.id)).not.toContain("ms")
  })
})
