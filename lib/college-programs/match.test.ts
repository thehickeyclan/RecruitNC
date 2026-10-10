import { describe, expect, it } from "vitest"

import data from "./programs-2026-27.json"
import { ALIASES, buildSchoolIndex, matchSchool, nameKey } from "./match"

const index = buildSchoolIndex(data.schools)
const ids = new Set(data.schools.map((s) => s.id))

describe("college map school matching", () => {
  it("every alias points at a school on the map", () => {
    for (const [alias, id] of Object.entries(ALIASES)) expect(ids.has(id), alias).toBe(true)
  })

  it("matches coach-typed short names", () => {
    expect(matchSchool(index, "Shenandoah")).toBe("shenandoah-university")
    expect(matchSchool(index, "Mount Olive University")).toBe("university-of-mount-olive")
    expect(matchSchool(index, "NC State")).toBe("north-carolina-state-university-nc-state")
  })

  it("never lets one UNC claim another", () => {
    expect(matchSchool(index, "UNC Chapel Hill")).toBe("university-of-north-carolina-at-chapel-hill-north-carolina")
    expect(matchSchool(index, "UNC Pembroke")).toBe("university-of-north-carolina-at-pembroke")
    expect(matchSchool(index, "UNC")).toBeNull()
  })

  it("drops a name two schools share instead of guessing", () => {
    // Cornell College (IA) and Cornell University both reduce to "cornell".
    expect(nameKey("Cornell University")).toBe(nameKey("Cornell College"))
    expect(matchSchool(index, "Cornell")).toBeNull()
  })

  it("has no programs outside the five divisions", () => {
    const divisions = new Set(data.schools.flatMap((s) => s.programs.map((p) => p.division)))
    expect([...divisions].sort()).toEqual(["NAIA", "NCAA Division I", "NCAA Division II", "NCAA Division III", "NJCAA"])
  })
})
