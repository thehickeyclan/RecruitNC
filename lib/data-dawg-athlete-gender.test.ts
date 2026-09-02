import { describe, expect, it } from "vitest"

import {
  athleteGenderWritingNote,
  athletePronouns,
  normalizeAthleteGender,
} from "./data-dawg-athlete-gender"

describe("Data Dawg athlete gender language", () => {
  it("normalizes the values used by athlete profiles", () => {
    expect(normalizeAthleteGender("Male")).toBe("Male")
    expect(normalizeAthleteGender("boy")).toBe("Male")
    expect(normalizeAthleteGender("Female")).toBe("Female")
    expect(normalizeAthleteGender("girls")).toBe("Female")
  })

  it("does not guess when gender is absent or unrecognized", () => {
    expect(normalizeAthleteGender(null)).toBeNull()
    expect(normalizeAthleteGender("unknown")).toBeNull()
    expect(athletePronouns(null)).toEqual({ subject: "they", object: "them", possessive: "their" })
    expect(athleteGenderWritingNote("Angel Olalde", null)).toContain("Never infer gender from a name")
  })

  it("gives the model explicit recorded pronouns", () => {
    expect(athleteGenderWritingNote("Angel Olalde", "Male")).toContain("he/him/his")
    expect(athleteGenderWritingNote("Jane Wrestler", "Female")).toContain("she/her")
  })
})
