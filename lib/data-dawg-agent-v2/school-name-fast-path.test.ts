import { describe, expect, it } from "vitest"
import { isLikelySchoolWrestlingLookup } from "./school-name-fast-path-detect"
import { isLikelyAthleteNameLookup } from "./athlete-name-fast-path-detect"

describe("isLikelySchoolWrestlingLookup", () => {
  it("matches Cardinal Gibbons high school phrasing", () => {
    expect(isLikelySchoolWrestlingLookup("cardinal gibbons high school")).toBe(true)
    expect(isLikelySchoolWrestlingLookup("Cardinal Gibbons")).toBe(true)
    expect(isLikelySchoolWrestlingLookup("tell me about Avery County wrestling")).toBe(true)
  })

  it("rejects athlete and ranking queries", () => {
    expect(isLikelySchoolWrestlingLookup("mac johnson")).toBe(false)
    expect(isLikelySchoolWrestlingLookup("who is Mac Johnson")).toBe(false)
    expect(isLikelySchoolWrestlingLookup("class of 2027 rankings")).toBe(false)
  })
})

describe("athlete vs school routing", () => {
  it("does not treat school queries as athlete lookups", () => {
    expect(isLikelyAthleteNameLookup("cardinal gibbons high school")).toBe(false)
    expect(isLikelyAthleteNameLookup("Cardinal Gibbons")).toBe(false)
    expect(isLikelyAthleteNameLookup("mac johnson")).toBe(true)
  })
})
