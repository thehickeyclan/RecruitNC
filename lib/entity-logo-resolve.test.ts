import { describe, expect, it } from "vitest"
import { distinctiveSchoolWords, getDirectCollegeLogoUrl, sameSchoolName } from "@/lib/entity-logo-resolve"

describe("getDirectCollegeLogoUrl", () => {
  it("resolves Roanoke to the blob mark (not a missing public PNG)", () => {
    const url = getDirectCollegeLogoUrl("Roanoke")
    expect(url).toContain("blob.vercel-storage.com")
    expect(url).not.toContain("roanoke-college-logo.png")
  })

  it("does not map short tokens like State/NC onto the wrong crest", () => {
    expect(getDirectCollegeLogoUrl("State")).toBeNull()
    expect(getDirectCollegeLogoUrl("NC")).toBeNull()
  })

  it("resolves NC State to the real block S, not the /wolfpack-logo.png placeholder", () => {
    for (const name of ["NC State", "North Carolina State", "North Carolina State University"]) {
      const url = getDirectCollegeLogoUrl(name)
      expect(url).toContain("blob.vercel-storage.com")
      expect(url).not.toContain("wolfpack-logo.png")
    }
  })
})

describe("sameSchoolName", () => {
  it.each([
    ["Liberty", "Liberty University"],
    ["Appalachian State", "Appalachian State University"],
    ["The University of Virginia", "Virginia"],
    ["Greensboro College", "Greensboro"],
    ["Washington & Lee", "Washington and Lee University"],
  ])("%s is %s", (a, b) => expect(sameSchoolName(a, b)).toBe(true))

  it.each([
    ["The University of Virginia", "Ohio University"],
    ["Ohio State", "Ohio University"],
    ["Washington and Jefferson College", "Washington & Lee"],
    ["Virginia", "Virginia Tech"],
    ["Virginia", "West Virginia University"],
    ["University", "Ohio University"],
  ])("%s is not %s", (a, b) => expect(sameSchoolName(a, b)).toBe(false))
})

describe("distinctiveSchoolWords", () => {
  it("drops the words every school shares", () => {
    expect(distinctiveSchoolWords("The University of Virginia")).toEqual(["virginia"])
    expect(distinctiveSchoolWords("Ohio State University")).toEqual(["ohio", "state"])
  })
})
