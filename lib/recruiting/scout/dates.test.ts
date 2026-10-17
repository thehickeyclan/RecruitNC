import { describe, expect, it } from "vitest"

import { resolveRuleDate } from "@/lib/recruiting/scout/dates"

const oct2026 = new Date("2026-10-17T12:00:00Z")
const label = (v: string, c: number) => resolveRuleDate(v, c, oct2026)?.label ?? null

describe("resolveRuleDate", () => {
  it("places a junior-year date for the class of 2028", () => {
    expect(label("April 1 of junior year", 2028)).toBe("April 1, 2027")
    expect(label("From January 1 of junior year; one per school, 48 hours at most", 2028)).toBe("January 1, 2027")
  })
  it("reads before, start and end of a year", () => {
    expect(label("June 15 immediately before junior year", 2028)).toBe("June 15, 2026")
    expect(label("From June 1 before junior year; one per school each year", 2028)).toBe("June 1, 2026")
    expect(label("June 15 at the end of sophomore year", 2027)).toBe("June 15, 2025")
    expect(label("August 1 at the start of junior year", 2027)).toBe("August 1, 2025")
    expect(label("June 15 at the end of junior year", 2028)).toBe("June 15, 2027")
    expect(label("August 15 of senior year", 2028)).toBe("August 15, 2027")
  })
  it("says whether it is open yet", () => {
    expect(resolveRuleDate("April 1 of junior year", 2028, oct2026)?.open).toBe(false)
    expect(resolveRuleDate("June 15 immediately before junior year", 2028, oct2026)?.open).toBe(true)
  })
  it("leaves undated rules alone", () => {
    expect(label("Any time", 2028)).toBeNull()
    expect(label("November 1", 2028)).toBeNull()
    expect(label("After you have finished sophomore year", 2028)).toBeNull()
  })
})
