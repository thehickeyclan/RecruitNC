import { describe, expect, it } from "vitest"
import {
  extractSchoolLookupPhrase,
  isLikelySchoolWrestlingLookup,
} from "./school-name-fast-path-detect"
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

  it("extracts the school from possessive school-history questions", () => {
    expect(extractSchoolLookupPhrase("Who are all of Cary High's state champions?")).toBe("Cary High")
    expect(extractSchoolLookupPhrase("Who are all of Cary''s state champions?")).toBe("Cary")
    expect(extractSchoolLookupPhrase("Show me the state champions from Cary High School")).toBe("Cary High School")
    expect(extractSchoolLookupPhrase("How many state champions does Cary High have?")).toBe("Cary High")
  })

  it("routes natural history questions for schools outside the built-in name hints", () => {
    expect(isLikelySchoolWrestlingLookup("Who are Wheatmore's state champions?")).toBe(true)
    expect(isLikelySchoolWrestlingLookup("Who are Rosewood High's state champions?")).toBe(true)
    expect(isLikelySchoolWrestlingLookup("How many state champions does Wheatmore High have?")).toBe(true)
    expect(extractSchoolLookupPhrase("Who are Wheatmore's state champions?")).toBe("Wheatmore")
    expect(extractSchoolLookupPhrase("Who are Rosewood High's state champions?")).toBe("Rosewood High")
  })
})

describe("athlete vs school routing", () => {
  it("does not treat school queries as athlete lookups", () => {
    expect(isLikelyAthleteNameLookup("cardinal gibbons high school")).toBe(false)
    expect(isLikelyAthleteNameLookup("Cardinal Gibbons")).toBe(false)
    expect(isLikelyAthleteNameLookup("mac johnson")).toBe(true)
  })
})
