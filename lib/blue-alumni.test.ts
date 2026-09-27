import { describe, expect, it } from "vitest"
import { alumniCutoffYear } from "@/lib/blue-alumni"

describe("who counts as a Blue alumnus", () => {
  /*
   * The bug this replaces: the cutoff was the literal 2025, so in September 2026 the class
   * that had graduated in the spring and gone to college was still missing from the list.
   */
  it("counts the class that graduated this spring, from July", () => {
    expect(alumniCutoffYear(new Date("2026-09-27T12:00:00Z"))).toBe(2026)
    expect(alumniCutoffYear(new Date("2026-07-01T12:00:00Z"))).toBe(2026)
  })

  it("does not count seniors who are still in school", () => {
    expect(alumniCutoffYear(new Date("2026-02-21T12:00:00Z"))).toBe(2025)
    expect(alumniCutoffYear(new Date("2026-06-30T12:00:00Z"))).toBe(2025)
  })

  it("moves on its own each year", () => {
    expect(alumniCutoffYear(new Date("2027-08-01T12:00:00Z"))).toBe(2027)
    expect(alumniCutoffYear(new Date("2028-01-15T12:00:00Z"))).toBe(2027)
  })
})
