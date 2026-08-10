import { describe, expect, it } from "vitest"
import { getCurrentSigningClass, getDefaultCommitClassYear } from "./commit-class-year"

/**
 * The class we highlight has to roll over in July, not January.
 *
 * The previous version read the calendar year, so between graduation and New Year the site
 * led with a class that had already left high school — in August 2026 the home page still
 * said "Class of 2026 Commits" while that class's own send-off article said their board was
 * closed. These cases pin the boundary so it cannot drift back.
 */
describe("getCurrentSigningClass", () => {
  it("follows the class still in school during their senior year", () => {
    // January–June 2027: the class of 2027 is mid-senior-season.
    expect(getCurrentSigningClass(new Date("2027-01-15T12:00:00Z"))).toBe(2027)
    expect(getCurrentSigningClass(new Date("2027-06-30T12:00:00Z"))).toBe(2027)
  })

  it("moves on in July, once the class has graduated", () => {
    expect(getCurrentSigningClass(new Date("2026-06-30T12:00:00Z"))).toBe(2026)
    expect(getCurrentSigningClass(new Date("2026-07-01T12:00:00Z"))).toBe(2027)
  })

  it("highlights the class of 2027 today", () => {
    expect(getCurrentSigningClass(new Date("2026-08-07T12:00:00Z"))).toBe(2027)
  })

  it("opens the commit leaderboards on every class, not the new one", () => {
    // Scoped to the current signing class the leaderboards opened on 8 commitments across
    // 5 colleges, which reads as broken rather than as early in the cycle.
    expect(getDefaultCommitClassYear()).toBe("all")
  })
})
