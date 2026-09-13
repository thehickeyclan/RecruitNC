import { describe, expect, it } from "vitest"
import { formatCalendarDate } from "./calendar-date"

describe("formatCalendarDate", () => {
  it("shows a date-only value as that day, not the day before", () => {
    // The drop-in confirmation said Saturday the 12th for Sunday's practice.
    expect(formatCalendarDate("2026-09-13")).toBe("Sunday, September 13, 2026")
  })

  it("shows a late-evening Eastern timestamp on its Eastern day", () => {
    expect(formatCalendarDate("2026-09-14T01:30:00Z")).toBe("Sunday, September 13, 2026")
  })

  it("returns empty for nothing, and the raw text for something unreadable", () => {
    expect(formatCalendarDate(null)).toBe("")
    expect(formatCalendarDate("TBD")).toBe("TBD")
  })
})
