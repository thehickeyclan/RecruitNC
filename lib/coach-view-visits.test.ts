import { describe, expect, it } from "vitest"
import { groupCoachVisits } from "./coach-view-visits"

describe("groupCoachVisits", () => {
  it("folds a program's views inside 24 hours into one visit", () => {
    const visits = groupCoachVisits([
      { school: "Ferrum College", at: "2026-08-25T01:18:00Z" },
      { school: "Ferrum College", at: "2026-08-25T01:17:00Z" },
      { school: "Ferrum College", at: "2026-08-25T01:14:00Z" },
      { school: "Ferrum College", at: "2026-08-25T01:12:00Z" },
    ])
    expect(visits).toEqual([
      { school: "Ferrum College", first: "2026-08-25T01:12:00Z", last: "2026-08-25T01:18:00Z", views: 4 },
    ])
  })

  it("anchors the window on the first view, so a daily check-in is a visit a day", () => {
    const visits = groupCoachVisits([
      { school: "Ferrum College", at: "2026-08-15T14:30:00Z" },
      { school: "Ferrum College", at: "2026-08-15T15:38:00Z" },
      { school: "Ferrum College", at: "2026-08-16T00:11:00Z" },
      { school: "Ferrum College", at: "2026-08-16T15:33:00Z" },
    ])
    expect(visits.map((v) => v.views)).toEqual([1, 3])
  })

  it("never merges two programs, even when their views interleave", () => {
    const visits = groupCoachVisits([
      { school: "Ferrum College", at: "2026-10-05T14:00:00Z" },
      { school: "Johns Hopkins", at: "2026-10-05T14:05:00Z" },
      { school: "Ferrum College", at: "2026-10-05T14:10:00Z" },
    ])
    expect(visits).toHaveLength(2)
    expect(visits.find((v) => v.school === "Ferrum College")?.views).toBe(2)
  })

  it("lists visits newest first", () => {
    const visits = groupCoachVisits([
      { school: "Ferrum College", at: "2026-09-25T22:28:00Z" },
      { school: "Johns Hopkins", at: "2026-10-05T14:44:00Z" },
    ])
    expect(visits.map((v) => v.school)).toEqual(["Johns Hopkins", "Ferrum College"])
  })
})
