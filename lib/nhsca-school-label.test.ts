import { describe, expect, it } from "vitest"
import {
  buildKnownSchoolEntries,
  resolveNhscaLeaderboardSchool,
} from "@/lib/nhsca-school-label"

describe("resolveNhscaLeaderboardSchool", () => {
  const known = buildKnownSchoolEntries([
    "Cary High School",
    "Lake Norman",
    "Northwest Guilford",
    "Cardinal Gibbons",
    "Green Hope",
    "Avery County",
    "Wheatmore",
    "South View",
    "North Henderson",
    "Concord",
    "Mooresville",
    "Asheboro",
    "Trinity",
    "Parkland",
    "Uwharrie Charter",
    "Southern Alamance",
    "Riverside",
  ])

  it("drops city/state scraps that are not schools", () => {
    expect(resolveNhscaLeaderboardSchool("Raleigh", known)).toBeNull()
    expect(resolveNhscaLeaderboardSchool("Greensboro", known)).toBeNull()
    expect(resolveNhscaLeaderboardSchool("NC", known)).toBeNull()
    expect(resolveNhscaLeaderboardSchool("North Carolina", known)).toBeNull()
    expect(resolveNhscaLeaderboardSchool("Charlotte", known)).toBeNull()
  })

  it("maps known short names onto classification schools", () => {
    expect(resolveNhscaLeaderboardSchool("Cary", known)).toBe("Cary")
    expect(resolveNhscaLeaderboardSchool("Cary High School", known)).toBe("Cary")
    expect(resolveNhscaLeaderboardSchool("Cardinal Gibbons", known)).toBe("Cardinal Gibbons")
    expect(resolveNhscaLeaderboardSchool("Lake Norman", known)).toBe("Lake Norman")
  })

  it("does not invent a match for an unmatched bare city with many schools", () => {
    expect(resolveNhscaLeaderboardSchool("Durham", known)).toBeNull()
  })
})
