import { describe, expect, it } from "vitest"
import { buildAthleteUpdateFromRequest } from "./apply-edit-request"

describe("buildAthleteUpdateFromRequest", () => {
  it("maps the scalar bio fields onto their columns", () => {
    const plan = buildAthleteUpdateFromRequest({
      currentData: {
        bio: { club: "School of hard knocks", weight: "157", highSchool: "Trinity high school", cellNumber: "3362401863" },
      },
    })
    expect(plan.updates).toEqual({
      wrestlingClub: "School of hard knocks",
      weightclass: "157",
      highschool: "Trinity high school",
      phone: "(336) 240-1863",
    })
    expect(plan.manual).toEqual([])
  })

  it("keeps free text out of the update and reports it for a human", () => {
    const plan = buildAthleteUpdateFromRequest({
      currentData: { bio: { other: "Need to correct Athlete profile" }, achievements: "Fargo 2026 should be 144 not 190" },
    })
    expect(plan.updates).toEqual({})
    expect(plan.manual).toHaveLength(2)
  })

  it("ignores blanks rather than wiping a populated column", () => {
    const plan = buildAthleteUpdateFromRequest({
      currentData: { bio: { club: "   ", weight: null, highSchool: "" }, academics: { gpa: null, sat: "", act: null } },
    })
    expect(plan.updates).toEqual({})
  })

  it("reads academics as numbers", () => {
    const plan = buildAthleteUpdateFromRequest({ currentData: { academics: { gpa: "3.75", sat: 1440, act: "17" } } })
    expect(plan.updates).toEqual({ academic_gpa: 3.75, academic_sat: 1440, academic_act: 17 })
  })

  it("refuses to write a non-phone into the phone column", () => {
    const plan = buildAthleteUpdateFromRequest({ currentData: { bio: { cellNumber: "Email" } } })
    expect(plan.updates.phone).toBeUndefined()
    expect(plan.manual).toEqual(["Contact number, not a phone number: Email"])
  })

  it("survives a request with no data at all", () => {
    expect(buildAthleteUpdateFromRequest(null)).toEqual({ updates: {}, manual: [] })
    expect(buildAthleteUpdateFromRequest({})).toEqual({ updates: {}, manual: [] })
  })
})
