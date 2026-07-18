import { describe, expect, it } from "vitest"
import {
  formatNextBluePracticeAnswer,
  isBluePracticeScheduleQuery,
  type BluePracticeEvent,
} from "./data-dawg-next-blue-practice"

describe("Blue practice calendar answers", () => {
  it("recognizes natural Blue schedule questions", () => {
    expect(isBluePracticeScheduleQuery("when is the next Blue practice")).toBe(true)
    expect(isBluePracticeScheduleQuery("Where does NC United practice next?")).toBe(true)
    expect(isBluePracticeScheduleQuery("What is the Blue program?")).toBe(false)
  })

  it("includes the calendar's time, location, and details", () => {
    const event: BluePracticeEvent = {
      title: "NC United Blue Practice",
      start_date: "2026-07-21",
      end_date: null,
      start_time: "18:30:00",
      end_time: "20:00:00",
      location: "United Training Center ·\n\nRaleigh..",
      description: "Bring wrestling shoes and water.",
      coach: "Coach Smith",
      registration_deadline: null,
      entry_fee: null,
      travel_info: null,
      weight_classes: null,
      rsvp_required: true,
      external_link: null,
      drop_in_registration_link: "https://example.com/register",
    }

    const answer = formatNextBluePracticeAnswer([event])
    expect(answer).toContain("Tuesday, July 21, 2026")
    expect(answer).toContain("6:30 PM–8:00 PM")
    expect(answer).toContain("United Training Center · Raleigh.")
    expect(answer).toContain("[Open in Google Maps](https://www.google.com/maps/search/?api=1&query=United%20Training%20Center%20%C2%B7%20Raleigh.)")
    expect(answer).toContain("Bring wrestling shoes and water.")
    expect(answer).toContain("**Details:**")
    expect(answer).toContain("https://example.com/register")
  })
})
