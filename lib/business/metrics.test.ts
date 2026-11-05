import { describe, expect, it } from "vitest"

import { type AthleteDim, type MetricEvent, bucketsBetween, dayOf, distinctSeries, mostViewed, series, stateSummary, statesPresent, weekOf, weeksBetween } from "@/lib/business/metrics"

const dims = new Map<string, AthleteDim>([
  ["nc-boy", { state: "NC", gender: "Male", classYear: 2027, claimed: true }],
  ["nc-girl", { state: "NC", gender: "Female", classYear: 2028, claimed: true }],
  ["sc-boy", { state: "SC", gender: "Male", classYear: 2027, claimed: false }],
  ["no-state", { state: null, gender: "Male", classYear: null, claimed: false }],
])

const WINDOW = { from: "2026-10-05", to: "2026-11-01" }
const all = { state: "all", gender: "all" as const, site: "all" as const }

describe("weekOf", () => {
  it("puts a day on its Monday", () => {
    expect(weekOf("2026-11-04T12:00:00Z")).toBe("2026-11-02")
    expect(weekOf("2026-11-02T12:00:00Z")).toBe("2026-11-02")
  })

  it("counts a Sunday evening in North Carolina as that week, not the next", () => {
    // 23:00 Sunday in Raleigh is 04:00 Monday UTC. The family signed up on Sunday.
    expect(weekOf("2026-11-02T04:00:00Z")).toBe("2026-10-26")
  })

  it("gives nothing for an unreadable date", () => {
    expect(weekOf("not a date")).toBe("")
  })
})

describe("weeksBetween", () => {
  it("returns every Monday in the span, inclusive", () => {
    expect(weeksBetween("2026-10-05", "2026-11-01")).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"])
  })
})

describe("series", () => {
  const events: MetricEvent[] = [
    { at: "2026-10-06T12:00:00Z", athleteId: "nc-boy", site: "rw" },
    { at: "2026-10-07T12:00:00Z", athleteId: "nc-girl", site: "ncu" },
    { at: "2026-10-14T12:00:00Z", athleteId: "sc-boy", site: "rw" },
    { at: "2026-10-15T12:00:00Z", athleteId: "nc-boy", site: null },
  ]

  it("buckets by week and totals what it drew", () => {
    const s = series("profiles_claimed", events, dims, all, WINDOW)
    expect(s.points).toEqual([
      { week: "2026-10-05", count: 2 },
      { week: "2026-10-12", count: 2 },
      { week: "2026-10-19", count: 0 },
      { week: "2026-10-26", count: 0 },
    ])
    expect(s.total).toBe(4)
  })

  it("filters by state", () => {
    const s = series("profiles_claimed", events, dims, { ...all, state: "NC" }, WINDOW)
    expect(s.total).toBe(3)
  })

  it("filters by gender", () => {
    const s = series("profiles_claimed", events, dims, { ...all, gender: "Female" }, WINDOW)
    expect(s.total).toBe(1)
  })

  it("filters by state and gender together", () => {
    const s = series("profiles_claimed", events, dims, { ...all, state: "NC", gender: "Male" }, WINDOW)
    expect(s.total).toBe(2)
  })

  it("treats an event with no site stamp as untagged, never as a brand", () => {
    expect(series("profiles_claimed", events, dims, { ...all, site: "rw" }, WINDOW).total).toBe(2)
    expect(series("profiles_claimed", events, dims, { ...all, site: "untagged" }, WINDOW).total).toBe(1)
  })

  it("refuses a brand filter on a source that carries no site stamp", () => {
    const s = series("profiles_created", events, dims, { ...all, site: "rw" }, WINDOW)
    expect(s.unavailable).toMatch(/site stamp/)
    expect(s.total).toBe(0)
    expect(s.points.every((p) => p.count === 0)).toBe(true)
  })

  it("leaves out events outside the window", () => {
    const outside: MetricEvent[] = [
      { at: "2026-09-01T12:00:00Z", athleteId: "nc-boy" },
      { at: "2026-12-01T12:00:00Z", athleteId: "nc-boy" },
    ]
    expect(series("profiles_claimed", outside, dims, all, WINDOW).total).toBe(0)
  })

  it("counts an account with no wrestler as unassigned, and only when nothing is filtered", () => {
    const logins: MetricEvent[] = [
      { at: "2026-10-06T12:00:00Z", athleteId: "nc-boy" },
      { at: "2026-10-06T13:00:00Z", athleteId: null },
      { at: "2026-10-06T14:00:00Z", athleteId: "someone-we-have-no-row-for" },
    ]
    const open = series("sign_ins", logins, dims, all, WINDOW)
    expect(open.total).toBe(3)
    expect(open.unassigned).toBe(2)

    const narrowed = series("sign_ins", logins, dims, { ...all, state: "NC" }, WINDOW)
    expect(narrowed.total).toBe(1)
    expect(narrowed.unassigned).toBe(0)
  })

  it("says where a young source actually starts", () => {
    const long = { from: "2025-01-01", to: "2026-11-01" }
    expect(series("profile_edits", [], dims, all, long).startsAt).toBe("2026-01-12")
    // A window that opens after the source did has nothing to warn about.
    expect(series("profile_edits", [], dims, all, { from: "2026-06-01", to: "2026-11-01" }).startsAt).toBeNull()
    expect(series("profiles_claimed", [], dims, all, { from: "2026-10-05", to: "2026-11-01" }).startsAt).toBeNull()
  })

  it("reports the start even when a brand filter made the series unavailable", () => {
    const long = { from: "2025-01-01", to: "2026-11-01" }
    expect(series("profile_edits", [], dims, { ...all, site: "rw" }, long).startsAt).toBe("2026-01-12")
  })
})

describe("statesPresent", () => {
  it("lists the states in the data, sorted, with no blanks", () => {
    expect(statesPresent(dims)).toEqual(["NC", "SC"])
  })
})

describe("stateSummary claims", () => {
  it("counts a profile a parent holds, not only one the wrestler claimed", () => {
    const dimsWithParent = new Map(dims)
    // Held by a parent alone: no dated claim event for it at all.
    dimsWithParent.set("nc-parent-held", { state: "NC", gender: "Male", classYear: 2027, claimed: true })
    const events = {
      profiles_created: [],
      profiles_claimed: [{ at: "2026-10-06T12:00:00Z", athleteId: "nc-boy" }],
      profile_edits: [],
      coach_views: [],
      coach_stars: [],
      sign_ins: [],
    }
    const s = stateSummary("NC", "all", dimsWithParent, events, new Date("2026-11-04T12:00:00Z"))
    expect(s.claimed).toBe(3)
    expect(s.byClass.find((c) => c.classYear === 2027)?.claimed).toBe(2)
  })

  it("leaves out a state's unclaimed wrestlers", () => {
    const events = {
      profiles_created: [],
      profiles_claimed: [],
      profile_edits: [],
      coach_views: [],
      coach_stars: [],
      sign_ins: [],
    }
    expect(stateSummary("SC", "all", dims, events, new Date("2026-11-04T12:00:00Z")).claimed).toBe(0)
  })
})

describe("day buckets", () => {
  it("gives one bar a day, so a seven-day window is a chart and not a single bar", () => {
    expect(bucketsBetween("2026-11-01", "2026-11-04", "day")).toEqual(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"])
    expect(bucketsBetween("2026-11-01", "2026-11-04", "week")).toEqual(["2026-10-26", "2026-11-02"])
  })

  it("puts an instant on its Eastern day, not its UTC one", () => {
    // 23:00 Sunday in Raleigh is 04:00 Monday UTC.
    expect(dayOf("2026-11-02T04:00:00Z")).toBe("2026-11-01")
  })
})

describe("distinctSeries", () => {
  const WIN = { from: "2026-10-05", to: "2026-11-01" }
  const views: MetricEvent[] = [
    { at: "2026-10-06T12:00:00Z", athleteId: "nc-boy", by: "NC State", byUser: "c1" },
    { at: "2026-10-07T12:00:00Z", athleteId: "nc-boy", by: "NC State", byUser: "c2" },
    { at: "2026-10-08T12:00:00Z", athleteId: "nc-girl", by: "Campbell", byUser: "c3" },
    { at: "2026-10-14T12:00:00Z", athleteId: "sc-boy", by: "NC State", byUser: "c1" },
  ]

  it("counts how many different ones, not how many times", () => {
    const s = distinctSeries("coach_views", "Programs", views, dims, all, WIN, (e) => e.by)
    expect(s.points.find((p) => p.week === "2026-10-05")?.count).toBe(2)
    expect(s.points.find((p) => p.week === "2026-10-12")?.count).toBe(1)
  })

  it("totals distinct across the window, never the sum of the weeks", () => {
    // NC State looked in both weeks. Adding the weeks would say three programs; there are two.
    expect(distinctSeries("coach_views", "Programs", views, dims, all, WIN, (e) => e.by).total).toBe(2)
    expect(distinctSeries("coach_views", "Coaches", views, dims, all, WIN, (e) => e.byUser).total).toBe(3)
  })

  it("narrows by the gender of the wrestler who was looked at", () => {
    const girls = distinctSeries("coach_views", "Programs", views, dims, { ...all, gender: "Female" }, WIN, (e) => e.by)
    expect(girls.total).toBe(1)
  })
})

describe("mostViewed", () => {
  const views: MetricEvent[] = [
    { at: "2026-10-06T12:00:00Z", athleteId: "nc-boy", by: "NC State" },
    { at: "2026-10-07T12:00:00Z", athleteId: "nc-boy", by: "Campbell" },
    { at: "2026-10-07T13:00:00Z", athleteId: "nc-boy", by: "Campbell" },
    { at: "2026-10-08T12:00:00Z", athleteId: "nc-girl", by: "Campbell" },
  ]
  const WIN = { from: "2026-10-05", to: "2026-11-01" }

  it("ranks by views and counts the programs behind them", () => {
    const rows = mostViewed(views, dims, all, WIN)
    expect(rows[0]).toEqual({ athleteId: "nc-boy", views: 3, programs: 2 })
    expect(rows[1]).toEqual({ athleteId: "nc-girl", views: 1, programs: 1 })
  })

  it("filters by class year and gender", () => {
    expect(mostViewed(views, dims, { ...all, gender: "Female" }, WIN).map((r) => r.athleteId)).toEqual(["nc-girl"])
    expect(mostViewed(views, dims, { ...all, classYear: 2028 }, WIN).map((r) => r.athleteId)).toEqual(["nc-girl"])
  })
})
