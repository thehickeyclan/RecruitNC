import { describe, expect, it } from "vitest"
import { getDirectCollegeLogoUrl } from "@/lib/entity-logo-resolve"

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
