import { describe, expect, it } from "vitest"
import { PRIVATE_ATHLETE_FIELDS, stripPrivateAthleteFields } from "@/lib/athlete-private-fields"

/** The fields a real profile actually came back with, before this guard existed. */
const row = {
  id: "f4236c5d",
  name: "Ayden Sumners",
  highschool: "Wheatmore",
  weightclass: "126",
  prospect_ranking: 10,
  college: "VMI",
  phone: "704-555-0100",
  contactEmail: "family@example.com",
  academic_gpa: 3.9,
  birthdate: "2009-04-02",
  claimed_by_user_id: "user-1",
  prospect_notes: "internal",
}

describe("stripPrivateAthleteFields", () => {
  it("removes contact, academics, age and internal notes", () => {
    const out = stripPrivateAthleteFields(row) as Record<string, unknown>
    for (const field of ["phone", "contactEmail", "academic_gpa", "birthdate", "claimed_by_user_id", "prospect_notes"]) {
      expect(out).not.toHaveProperty(field)
    }
  })

  it("keeps every competition fact the profile is made of", () => {
    const out = stripPrivateAthleteFields(row) as Record<string, unknown>
    expect(out.name).toBe("Ayden Sumners")
    expect(out.highschool).toBe("Wheatmore")
    expect(out.weightclass).toBe("126")
    expect(out.prospect_ranking).toBe(10)
    expect(out.college).toBe("VMI")
  })

  it("does not mutate the row it was given", () => {
    const copy = { ...row }
    stripPrivateAthleteFields(copy)
    expect(copy.phone).toBe("704-555-0100")
  })

  it("covers both spellings of the columns that have two", () => {
    // The row carries `contactEmail` in one place and `contact_email` in another, and a profile
    // written by a different importer has `cell` where this one has `phone`.
    for (const pair of [
      ["phone", "cell"],
      ["contactEmail", "contact_email"],
      ["academic_gpa", "gpa"],
      ["birthdate", "date_of_birth"],
    ]) {
      for (const field of pair) expect(PRIVATE_ATHLETE_FIELDS).toContain(field)
    }
  })
})
