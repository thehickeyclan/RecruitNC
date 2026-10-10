import { describe, expect, it } from "vitest"

import { roleRank, staffForSchool } from "./staff"

describe("college staff", () => {
  it("ranks titles head coach first and support staff last", () => {
    expect(roleRank("Head Coach")).toBe(0)
    expect(roleRank("Interim Head Coach")).toBe(0)
    expect(roleRank("Director of Wrestling")).toBe(0)
    expect(roleRank("Associate Head Coach")).toBe(1)
    expect(roleRank("Head Assistant Coach")).toBe(2)
    expect(roleRank("Assistant Coach")).toBe(3)
    expect(roleRank("Volunteer Assistant Coach")).toBe(4)
    expect(roleRank("Director of Wrestling Operations")).toBe(5)
    expect(roleRank("Athletic Trainer")).toBe(5)
  })

  it("lists a school's staff head coach first", () => {
    expect(staffForSchool("arizona-state-university")[0]).toMatchObject({ name: "Zeke Jones", title: "Head Coach" })
  })

  it("returns nothing, not an error, for a school whose staff was not captured", () => {
    expect(staffForSchool("luther-college")).toEqual([])
  })
})
