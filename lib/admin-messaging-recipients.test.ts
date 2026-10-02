import { describe, expect, it } from "vitest"
import { isHeadCoachTitle, parseCollegeCoachFilter } from "./admin-messaging-recipients"

describe("college coach filters", () => {
  it("keeps the original state groups working", () => {
    expect(parseCollegeCoachFilter("toc-college-coaches:NC").states).toEqual(["NC"])
    expect(parseCollegeCoachFilter("toc-college-coaches:NC-SC-TN-VA").states).toEqual(["NC", "SC", "TN", "VA"])
  })
  it("reads division, state, role and programs from the group id", () => {
    const f = parseCollegeCoachFilter(
      "toc-college-coaches?division=NCAA%20Division%20I,NAIA&state=NC,VA&role=head&programs=Duke%20University|Campbell%20University",
    )
    expect(f).toEqual({
      divisions: ["NCAA Division I", "NAIA"],
      states: ["NC", "VA"],
      role: "head",
      programs: ["Duke University", "Campbell University"],
    })
  })
  it("tells head coaches from assistants", () => {
    expect(isHeadCoachTitle("Head Wrestling Coach")).toBe(true)
    expect(isHeadCoachTitle("Associate Head Coach")).toBe(false)
    expect(isHeadCoachTitle("Assistant Coach")).toBe(false)
  })
})
