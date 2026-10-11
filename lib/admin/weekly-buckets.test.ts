import { describe, expect, it } from "vitest"
import { weekStart, weeklyCounts } from "./weekly-buckets"

describe("weekStart", () => {
  it("is the Monday of the Eastern week", () => {
    // Sunday 11 Oct 2026, mid-morning Eastern
    expect(weekStart(new Date("2026-10-11T13:00:00Z"))).toBe("2026-10-05")
    // Monday itself
    expect(weekStart(new Date("2026-10-05T16:00:00Z"))).toBe("2026-10-05")
  })

  it("keeps a late Sunday night in Raleigh in that week, though it is Monday in UTC", () => {
    expect(weekStart(new Date("2026-10-12T01:30:00Z"))).toBe("2026-10-05")
    expect(weekStart(new Date("2026-10-12T04:30:00Z"))).toBe("2026-10-12")
  })
})

describe("weeklyCounts", () => {
  const now = new Date("2026-10-11T13:00:00Z")

  it("returns every week oldest first, zeros included", () => {
    const out = weeklyCounts(["2026-10-06T12:00:00Z", "2026-10-11T12:00:00Z", "2026-09-22T12:00:00Z"], 4, now)
    expect(out.map((b) => b.weekStart)).toEqual(["2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"])
    expect(out.map((b) => b.count)).toEqual([0, 1, 0, 2])
    expect(out[3].label).toBe("Oct 5")
  })

  it("ignores blanks, junk and anything outside the window", () => {
    const out = weeklyCounts([null, undefined, "not a date", "2025-01-01T00:00:00Z"], 2, now)
    expect(out.map((b) => b.count)).toEqual([0, 0])
  })
})
