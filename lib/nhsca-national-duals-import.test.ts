import { describe, expect, it } from "vitest"
import { resolveNhscaNationalDualsProfiles, type NhscaDirectoryAthlete } from "@/lib/nhsca-national-duals-import"
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
    const age = resolveNhscaNationalDualsProfiles([entrant("Adam Walker", "Youth Team - EL")], [profile()], { eventYear: 2026 })
    expect(age.review[0]?.reason).toContain("Graduation year")
    const weight = resolveNhscaNationalDualsProfiles([entrant("Adam Walker", "Prestige Worldwide - HSB", "170")], [profile()], { eventYear: 2026 })
    expect(weight.review[0]?.reason).toContain("weights")
  })

  it("does not guess when the same source name appears on two teams", () => {
    const result = resolveNhscaNationalDualsProfiles(
      [entrant("Jacob Perry", "NC United Select - HSB", "152"), entrant("Jacob Perry", "Revival Jokers - MS", "100")],
      [profile({ id: "jacob", name: "Jacob Perry", graduationyear: 2028, weightclass: 152 })],
      { eventYear: 2026 },
    )
    expect(result.matches).toHaveLength(0)
    expect(result.review[0]?.reason).toContain("multiple source teams")
  })
})
