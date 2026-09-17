import { describe, expect, it } from "vitest"

import { clubCountKey, clubFamilyLabel } from "./club-family"

describe("club families", () => {
  it("groups every name RAW goes by under one key", () => {
    // Jordan Barbee's profile says "Raleigh Area Wolfpack"; seven others say "RAW"; John Perez
    // says "RAW WEST". All of them are RAW when counting.
    const keys = [
      "RAW",
      "raw",
      "Raleigh Area Wolfpack",
      "Raleigh Area Wrestling",
      "RAW West",
      "RAW WEST",
      "RAW Wrestling Club",
    ].map(clubCountKey)
    expect(new Set(keys).size).toBe(1)
  })

  it("labels the family RAW whichever name was typed", () => {
    for (const name of ["RAW", "Raleigh Area Wolfpack", "Raleigh Area Wrestling", "RAW WEST"]) {
      expect(clubFamilyLabel(name)).toBe("RAW")
    }
  })

  it("leaves a club outside any family as itself", () => {
    expect(clubFamilyLabel("Combat")).toBeNull()
    expect(clubCountKey("Combat")).toBe("combat")
    expect(clubCountKey("Combat")).not.toBe(clubCountKey("RAW"))
  })

  it("does not sweep in a club that only contains the letters raw", () => {
    // A substring match would have folded these into RAW. Matching is on the whole normalised name.
    expect(clubFamilyLabel("Rawlings Grappling")).toBeNull()
    expect(clubFamilyLabel("Straw Hat Wrestling")).toBeNull()
  })

  it("treats a missing club as no family", () => {
    expect(clubFamilyLabel(null)).toBeNull()
    expect(clubFamilyLabel("")).toBeNull()
  })
})
