import { describe, expect, it } from "vitest"

import { easternAt, reminderMessage, reminderPresets, reminderWhen } from "./reminders"
import { cleanVisit, visitDates, visitPhase } from "./visits"

describe("reminders", () => {
  it("places Eastern times across daylight saving", () => {
    expect(easternAt("2026-10-30", 9).toISOString()).toBe("2026-10-30T13:00:00.000Z")
    expect(easternAt("2026-11-10", 9).toISOString()).toBe("2026-11-10T14:00:00.000Z")
    expect(easternAt("2026-11-10", 21).toISOString()).toBe("2026-11-11T02:00:00.000Z")
    expect(reminderWhen("2026-11-10T14:00:00.000Z")).toBe("Tue, Nov 10 at 9:00 AM")
  })

  it("offers a week's follow-up for a school and the day before for a visit", () => {
    const now = new Date("2026-10-28T16:00:00Z")
    const school = reminderPresets({ now, school: { name: "Campbell" } })
    expect(school[0]).toMatchObject({ key: "follow-up-week", note: "Follow up with the Campbell coach.", remindAt: "2026-11-04T14:00:00.000Z" })
    const visit = reminderPresets({ now, visit: { startsOn: "2026-11-14", schoolName: "Davidson", kind: "official visit" } })
    expect(visit.map((p) => p.key)).toEqual(["visit-day-before", "visit-week-before", "visit-thank-you"])
    expect(visit[0].remindAt).toBe("2026-11-13T23:00:00.000Z")
  })

  it("no question marks in anything we add to the parent's note", () => {
    const m = reminderMessage({ note: "Call Coach Smith.", topic: "school" }, { schoolName: "Campbell", wrestlerFirstName: "Jake", brandName: "NC United", link: "https://x" })
    expect([m.title, m.subject, m.lead].join(" ")).not.toContain("?")
    expect(m.text.endsWith("NC United")).toBe(true)
    expect(m.text).not.toMatch(/NC United Wrestling/)
  })
})

describe("visits", () => {
  it("asks whether it happened once the last day has passed", () => {
    expect(visitPhase({ startsOn: "2026-11-08", endsOn: "2026-11-09", outcome: "planned" }, "2026-11-09")).toBe("upcoming")
    expect(visitPhase({ startsOn: "2026-11-08", endsOn: "2026-11-09", outcome: "planned" }, "2026-11-10")).toBe("confirm")
    expect(visitPhase({ startsOn: "2026-11-08", endsOn: null, outcome: "happened" }, "2026-11-10")).toBe("happened")
  })
  it("formats dates", () => {
    expect(visitDates({ startsOn: "2026-11-08", endsOn: "2026-11-09" })).toBe("Nov 8-9")
    expect(visitDates({ startsOn: "2026-11-30", endsOn: "2026-12-01" })).toBe("Nov 30 - Dec 1")
  })
  it("checks what a family sends", () => {
    expect(cleanVisit({ kind: "official", startsOn: "2026-11-09", endsOn: "2026-11-08" })).toBe("The last day is before the first.")
    expect(cleanVisit({ kind: "official", startsOn: "2026-11-08", who: " Mom and Jake " })).toMatchObject({ who: "Mom and Jake", endsOn: null })
  })
})
