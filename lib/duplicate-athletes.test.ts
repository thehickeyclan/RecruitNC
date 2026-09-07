import { describe, expect, it } from "vitest"
import { firstLast, prefersDuplicate } from "@/lib/duplicate-athletes"

describe("firstLast", () => {
  it("ignores a nickname sitting in the middle", () => {
    // The pair that started this: one profile held his record, the other his TOC registration,
    // and a full-name key treated them as different people.
    expect(firstLast("Amanuel “Manny” Kahsai")).toBe("amanuel kahsai")
    expect(firstLast("AMANUEL KAHSAI")).toBe("amanuel kahsai")
  })

  it("ignores case, punctuation and straight or curly quotes", () => {
    expect(firstLast('Joshua "Josh" Lemke')).toBe("joshua lemke")
    expect(firstLast("  joshua   lemke  ")).toBe("joshua lemke")
  })

  it("keeps first and last across a middle name", () => {
    expect(firstLast("Ayden James Terwilliger")).toBe("ayden terwilliger")
  })

  it("does not collapse two different people who share a surname", () => {
    expect(firstLast("Tye Johnson")).not.toBe(firstLast("Mac Johnson"))
  })

  it("survives a single-word name", () => {
    expect(firstLast("Titus")).toBe("titus")
    expect(firstLast("")).toBe("")
  })
})

describe("prefersDuplicate", () => {
  it("takes a true flag over a false one", () => {
    // These mark that something happened; a second row never hearing about it is not evidence.
    expect(prefersDuplicate("profile_verified", false, true)).toBe(true)
    expect(prefersDuplicate("profile_verified", true, false)).toBe(false)
  })

  it("takes a real NC United team over a stale none", () => {
    // The Blue signup created several of these duplicates, so the newer row is the informed one.
    expect(prefersDuplicate("ncUnitedTeam", "none", "blue")).toBe(true)
    expect(prefersDuplicate("ncUnitedTeam", "", "blue")).toBe(true)
  })

  it("never downgrades a real team to none", () => {
    expect(prefersDuplicate("ncUnitedTeam", "blue", "none")).toBe(false)
    expect(prefersDuplicate("ncUnitedTeam", "blue", "")).toBe(false)
  })

  it("leaves a ranking conflict to a person", () => {
    // 74 against 75 is one wrestler holding two slots — a rankings question, not a merge rule.
    expect(prefersDuplicate("prospect_ranking", 75, 74)).toBe(false)
  })

  it("leaves an email conflict to a person", () => {
    expect(prefersDuplicate("contactEmail", "coach@school.k12.nc.us", "athlete@gmail.com")).toBe(false)
  })
})
