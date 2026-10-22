import { describe, expect, it } from "vitest"

import { cleanAnswers, fieldForLabel, readiness } from "./fields"

describe("fieldForLabel", () => {
  // Labels copied from the real SIDEARM (Sacred Heart) and Front Rush forms, 22 Oct 2026.
  const cases: Array<[string, string | null]> = [
    ["Legal First Name", "firstName"],
    ["Preferred Name", "preferredName"],
    ["Middle Name", "middleName"],
    ["Last Name *", "lastName"],
    ["Email Address", "email"],
    ["Home Address1", "street"],
    ["City", "city"],
    ["Zip", "zip"],
    ["Cell Phone Number", "cell"],
    ["Date of Birth", "dob"],
    ["Parent/Guardian #1 Name", "parent1Name"],
    ["Parent/Guardian #1 Phone Number", "parent1Phone"],
    ["Parent/Guardian 1 Email Address", "parent1Email"],
    ["Parent/Guardian #2 Name", "parent2Name"],
    ["High School Graduation Year", "gradYear"],
    ["GPA", "gpa"],
    ["SAT Total", "sat"],
    ["ACT", "act"],
    ["Class Rank", "classRank"],
    ["Undergraduate Academic Interest (Major)", "major"],
    ["NCAA Eligibility Center ID Number", "ncaaId"],
    ["Weight", "weight"],
    ["Name of Club", "club"],
    ["Career Record", "record"],
    ["List of Athletic Accomplishment/Accolade(s)", "accolades"],
    ["Video Link", "video"],
    ["High School Coach's Name", "hsCoachName"],
    ["High School Coach's Phone Number", "hsCoachPhone"],
    ["High School Coach Email", "hsCoachEmail"],
    ["Club Coach’s Name", "clubCoachName"],
    ["Club Team Coach Phone Number", "clubCoachPhone"],
    ["Club Coach’s Email Address", "clubCoachEmail"],
    ["Father's Occupation", null],
    ["Siblings", null],
  ]
  it.each(cases)("%s -> %s", (label, key) => {
    expect(fieldForLabel(label)?.key ?? null).toBe(key)
  })
})

describe("cleanAnswers", () => {
  it("keeps known keys, trims, and drops values of the wrong shape", () => {
    expect(
      cleanAnswers({ dob: "2009-04-03", parent1Email: "not an email", street: "  12  Oak St ", video: "youtube.com/x", made: "up", zip: 27601 }),
    ).toEqual({ dob: "2009-04-03", street: "12 Oak St" })
  })
  it("refuses an impossible date of birth", () => {
    expect(cleanAnswers({ dob: "1890-01-01" })).toEqual({})
    expect(cleanAnswers({ dob: "04/03/2009" })).toEqual({})
  })
})

describe("readiness", () => {
  it("counts core answers and lists what is missing", () => {
    const r = readiness({ firstName: "Jake", lastName: "Amiott" })
    expect(r.ready).toBe(2)
    expect(r.missing.map((f) => f.key)).toContain("dob")
  })
})
