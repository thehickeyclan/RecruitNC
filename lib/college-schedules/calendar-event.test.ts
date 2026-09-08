import { describe, expect, it } from "vitest"
import { toCalendarEvent } from "./calendar-event"

const row = (over: Partial<Parameters<typeof toCalendarEvent>[0]> = {}) => ({
  id: "row-1",
  event_date: "2026-11-21",
  start_time: "19:00",
  event_type: "dual",
  opponent: "Northern Iowa",
  event_name: null,
  home_away: "home" as const,
  location: "Carmichael Arena",
  stream_url: "https://example.com/watch",
  notes: "TV: ACCNX",
  status: "scheduled" as const,
  ...over,
})

describe("toCalendarEvent", () => {
  it("reads the date in local time, not UTC", () => {
    // `new Date("2026-11-21")` is UTC midnight, which is the 20th in North Carolina — a meet
    // landing on the wrong day of the month grid is the kind of bug nobody reports, they just
    // stop trusting the calendar.
    const event = toCalendarEvent(row({ start_time: null }), "UNC")
    expect(event.date.getFullYear()).toBe(2026)
    expect(event.date.getMonth()).toBe(10) // November
    expect(event.date.getDate()).toBe(21)
  })

  it("keeps the start time when there is one", () => {
    const event = toCalendarEvent(row(), "UNC")
    expect(event.date.getHours()).toBe(19)
    expect(event.startTime).toBe("19:00")
  })

  it("names a home dual with vs and an away one with at", () => {
    expect(toCalendarEvent(row(), "UNC").title).toBe("UNC vs Northern Iowa")
    expect(toCalendarEvent(row({ home_away: "away" }), "UNC").title).toBe("UNC at Northern Iowa")
  })

  it("names a tournament without a vs or an at", () => {
    const event = toCalendarEvent(
      row({ event_type: "tournament", opponent: null, event_name: "ACC Championships", home_away: "neutral" }),
      "UNC",
    )
    expect(event.title).toBe("UNC ACC Championships")
  })

  it("says so when a meet is called off", () => {
    expect(toCalendarEvent(row({ status: "cancelled" }), "UNC").title).toBe("UNC vs Northern Iowa (cancelled)")
    expect(toCalendarEvent(row({ status: "postponed" }), "UNC").title).toBe("UNC vs Northern Iowa (postponed)")
  })

  it("namespaces the id so it cannot collide with a calendar event", () => {
    expect(toCalendarEvent(row(), "UNC").id).toBe("college:row-1")
  })

  it("carries the watch link and the broadcaster", () => {
    const event = toCalendarEvent(row(), "UNC")
    expect(event.externalLink).toBe("https://example.com/watch")
    expect(event.description).toBe("TV: ACCNX")
    expect(event.category).toBe("college-schedule")
    expect(event.location).toBe("Carmichael Arena")
  })

  it("survives a meet with nothing but a date", () => {
    const bare = toCalendarEvent(
      row({ opponent: null, event_name: null, start_time: null, location: null, stream_url: null, notes: null }),
      "UNC",
    )
    expect(bare.title).toBe("UNC vs TBA")
    expect(bare.description).toBeUndefined()
    expect(bare.externalLink).toBeUndefined()
  })
})
