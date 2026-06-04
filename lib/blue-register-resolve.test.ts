import { describe, expect, it } from "vitest"
import {
  athletePrefillFromInterestRow,
  mapInterestAchievement,
  missingAthleteFields,
  missingParentFields,
} from "./blue-register-resolve"

describe("blue-register-resolve", () => {
  it("maps interest achievement codes to signup labels", () => {
    expect(mapInterestAchievement("all_american")).toBe("All American")
    expect(mapInterestAchievement("state_qualifier")).toBe("State Qualifier")
    expect(mapInterestAchievement("na")).toBe("None")
  })

  it("builds invite prefill from interest row", () => {
    const prefill = athletePrefillFromInterestRow({
      first_name: "Aiden",
      last_name: "Campbell",
      cell_phone: "9105551212",
      graduation_year: "2028",
      highest_achievement: "all_american",
      high_school: "Test HS",
      club: "NC United",
      weight_class: "132",
    })
    expect(prefill.firstName).toBe("Aiden")
    expect(prefill.graduationYear).toBe(2028)
    expect(prefill.highestAchievement).toBe("All American")
    expect(missingAthleteFields(prefill)).toEqual(["email", "gpa"])
  })

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
