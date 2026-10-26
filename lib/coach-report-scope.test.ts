import { describe, expect, it } from "vitest"
import { reportGender, reportsOnAddress } from "@/lib/coach-reports"

describe("coach reports per address", () => {
  it("NC United lists North Carolina's reports; RecruitWrestlers adds South Carolina's", () => {
    expect(reportsOnAddress(false).map((d) => d.state)).toEqual(["NC", "NC"])
    expect(reportsOnAddress(true).map((d) => d.slug)).toContain("super32-2026-sc-mens")
  })
  it("the bracket decides men's or women's, then the profile", () => {
    expect(reportGender("Female", "boys")).toBe("Male")
    expect(reportGender("Male", "girls")).toBe("Female")
    expect(reportGender("Female", undefined)).toBe("Female")
    expect(reportGender(null, undefined)).toBe("Male")
  })
})
