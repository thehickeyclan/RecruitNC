import { describe, expect, it } from "vitest"
import { describeRegistrationInsertError } from "@/lib/national-team-registration-insert"

describe("describeRegistrationInsertError", () => {
  it("names missing gear columns", () => {
    expect(
      describeRegistrationInsertError({
        code: "42703",
        message: 'column "singlet_size" of relation "national_team_event_registrations" does not exist',
      }),
    ).toContain("Gear size columns")
  })

  it("names missing athlete_dob", () => {
    expect(
      describeRegistrationInsertError({
        code: "42703",
        message: 'column "athlete_dob" does not exist',
      }),
    ).toContain("date of birth")
  })
})
