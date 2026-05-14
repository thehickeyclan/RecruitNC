import { describe, expect, it } from "vitest"
import { normalizeFundraisingSchoolDisplay } from "./normalize-fundraising-school-display"

describe("normalizeFundraisingSchoolDisplay", () => {
  it("fixes Cardinal Gibbons roster typo", () => {
    expect(normalizeFundraisingSchoolDisplay("Cardinal fibbons")).toBe("Cardinal Gibbons")
    expect(normalizeFundraisingSchoolDisplay("CARDINAL FIBBONS")).toBe("Cardinal Gibbons")
  })

  it("passes through other schools", () => {
    expect(normalizeFundraisingSchoolDisplay("Cardinal Gibbons")).toBe("Cardinal Gibbons")
    expect(normalizeFundraisingSchoolDisplay("  Hough  ")).toBe("Hough")
  })
})
