import { describe, expect, it } from "vitest"
import {
  ilikeOrClause,
  nameSearchKeysForSchoolDossier,
  schoolDossierAthleteMatchesKnown,
  schoolDossierIlikePattern,
  schoolIlikePatterns,
  schoolNamesMatchForDossier,
} from "@/lib/data-dawg-school-nhsca-match"

describe("ilikeOrClause", () => {
  it("quotes patterns so spaces do not break PostgREST .or()", () => {
    const clause = ilikeOrClause("athlete_name", ["Liam Hickey", "Tyler Tracy"])
    expect(clause).toBe(
      'athlete_name.ilike."%Liam Hickey%",athlete_name.ilike."%Tyler Tracy%"',
    )
    expect(clause).not.toMatch(/athlete_name\.ilike\.%Liam Hickey%/)
  })
})

describe("nameSearchKeysForSchoolDossier", () => {
  it("includes First Last and omits comma forms that break .or()", () => {
    const keys = nameSearchKeysForSchoolDossier(["Liam Hickey", "Tyler Tracy"])
    expect(keys).toContain("Liam Hickey")
    expect(keys.some((k) => k.includes(","))).toBe(false)
  })
})

describe("schoolDossierAthleteMatchesKnown", () => {
  it("matches known NCHSAA placers to NHSCA athlete names", () => {
    expect(schoolDossierAthleteMatchesKnown("Liam Hickey", ["Liam Hickey", "Tyler Tracy"])).toBe(true)
    expect(schoolDossierAthleteMatchesKnown("Hickey, Liam", ["Liam Hickey"])).toBe(true)
    expect(schoolDossierAthleteMatchesKnown("Other Person", ["Liam Hickey"])).toBe(false)
  })
})

describe("schoolIlikePatterns", () => {
  it("adds stripped High School form", () => {
    const pats = schoolIlikePatterns("Cardinal Gibbons High School")
    expect(pats.some((p) => p.includes("Cardinal Gibbons"))).toBe(true)
  })

  it("adds a punctuation-safe form for hyphenated school names", () => {
    expect(schoolIlikePatterns("Newton-Conover")).toContain("%newton%conover%")
  })
})

describe("school dossier school-name matching", () => {
  it("queries and matches hyphenated and unhyphenated forms as the same school", () => {
    expect(schoolDossierIlikePattern("Newton Conover")).toBe("%newton%conover%")
    expect(schoolNamesMatchForDossier("Newton-Conover High School", "Newton Conover")).toBe(true)
  })

  it("does not collapse distinct campuses that share words", () => {
    expect(schoolNamesMatchForDossier("East Chapel Hill", "Chapel Hill")).toBe(false)
  })
})
