import { describe, expect, it } from "vitest"
import { missingAthleteFields, missingParentFields } from "./blue-register-resolve"

describe("blue-register-resolve", () => {
  it("lists missing parent fields", () => {
    expect(
      missingParentFields({
        email: "a@b.com",
        firstName: "Pat",
        lastName: "",
        phone: "",
        relationship: "Guardian",
      }),
    ).toEqual(["lastName", "phone"])
  })

  it("lists missing athlete fields", () => {
    expect(
      missingAthleteFields({
        firstName: "Mac",
        lastName: "Johnson",
        graduationYear: 2028,
        highSchool: "Test HS",
        weightClass: "132",
        wrestlingClub: "",
        cellPhone: "9105551212",
        email: "mac@test.com",
        gpa: "3.5",
        highestAchievement: "",
      }),
    ).toEqual(["wrestlingClub"])
  })
})
