import { describe, expect, it } from "vitest"

import { backgroundFor, backgroundLine, seasonStartYear, tenureText } from "./coach-backgrounds"

const oct2026 = new Date("2026-10-23T12:00:00Z")

describe("coach backgrounds", () => {
  it("counts the season in code", () => {
    expect(seasonStartYear(oct2026)).toBe(2026)
    expect(seasonStartYear(new Date("2027-03-01T12:00:00Z"))).toBe(2026)
    expect(tenureText({ name: "X", started: 2014, previous: null, wrestled: null, best: null, source: null }, "Arizona State", oct2026)).toBe("13th season at Arizona State (since 2014)")
    expect(tenureText({ name: "X", started: 2026, previous: null, wrestled: null, best: null, source: null }, "NC State", oct2026)).toBe("1st season at NC State (since 2026)")
  })
  it("reads a real coach", () => {
    const b = backgroundFor("campbell-university", "TJ Dudley")
    expect(b?.wrestled).toMatch(/Nebraska/)
    expect(backgroundLine(b!, "Campbell", oct2026)).toMatch(/^3rd season at Campbell \(since 2024\)\. Wrestled at University of Nebraska: 3x NCAA All-American\./)
  })
  it("says nothing it does not hold", () => {
    expect(backgroundLine({ name: "X", started: null, previous: null, wrestled: null, best: null, source: null }, "Duke", oct2026)).toBeNull()
  })
})
