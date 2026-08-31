import { describe, expect, it } from "vitest"
import {
  buildDailySeries,
  buildInsights,
  classifyPath,
  compareMonths,
  easternDay,
  findPowerUsers,
  summariseSections,
  summariseWindows,
  type ViewRow,
} from "./usage-analytics"

const at = (iso: string, userId: string | null = "u1", path = "/") => ({ userId, path, createdAt: iso }) as ViewRow

describe("classifyPath", () => {
  it.each([
    ["/tournament-of-champions", "toc"],
    ["/tournament-of-champions/field", "toc"],
    ["/view-profile", "profiles"],
    ["/athletes/a31bf725", "profiles"],
    ["/public-rankings/2027", "rankings"],
    ["/prospects/all", "rankings"],
    ["/clubs", "clubs"],
    ["/high-schools/apex", "schools"],
    ["/store/official-2026-shoe", "store"],
    ["/checkout/payment", "store"],
    ["/auth/signup", "account"],
    ["/", "home"],
    ["/something-else", "other"],
  ])("puts %s in %s", (path, section) => {
    expect(classifyPath(path)).toBe(section)
  })

  it("counts admin work as admin, not as interest in what it manages", () => {
    // /admin/toc/field is somebody doing their job, not a fan reading about the tournament.
    expect(classifyPath("/admin/toc/field")).toBe("admin")
    expect(classifyPath("/admin/users-dashboard")).toBe("admin")
  })

  it("ignores query strings and trailing slashes", () => {
    expect(classifyPath("/public-rankings/?year=2027")).toBe("rankings")
    expect(classifyPath("/clubs/")).toBe("clubs")
  })
})

describe("easternDay", () => {
  it("keeps a late evening in Eastern time on the same day", () => {
    // 01:30 UTC on the 31st is 21:30 on the 30th in North Carolina.
    expect(easternDay("2026-08-31T01:30:00Z")).toBe("2026-08-30")
  })

  it("rolls over at Eastern midnight, not UTC midnight", () => {
    expect(easternDay("2026-08-31T04:30:00Z")).toBe("2026-08-31")
  })
})

describe("summariseWindows", () => {
  const now = new Date("2026-08-31T16:00:00Z")
  const rows = [
    at("2026-08-31T15:00:00Z", "u1"),
    at("2026-08-29T15:00:00Z", "u2"),
    at("2026-08-10T15:00:00Z", "u1"),
    at("2026-06-10T15:00:00Z", "u3"),
    at("2025-12-10T15:00:00Z", "u4"),
  ]

  it("counts views and distinct people in each window", () => {
    const w = summariseWindows(rows, now)
    expect(w.today).toEqual({ views: 1, people: 1 })
    expect(w.week).toEqual({ views: 2, people: 2 })
    expect(w.month).toEqual({ views: 3, people: 2 })
    expect(w.all).toEqual({ views: 5, people: 4 })
  })

  it("treats 'this year' as the calendar year, not a rolling one", () => {
    // The December 2025 row is last year and must not count.
    expect(summariseWindows(rows, now).year.views).toBe(4)
  })
})

describe("compareMonths", () => {
  const now = new Date("2026-08-31T16:00:00Z")

  it("compares this calendar month with the last", () => {
    const c = compareMonths([at("2026-08-05T12:00:00Z"), at("2026-08-06T12:00:00Z"), at("2026-07-05T12:00:00Z")], now)
    expect(c.thisMonth).toMatchObject({ label: "2026-08", views: 2 })
    expect(c.lastMonth).toMatchObject({ label: "2026-07", views: 1 })
    expect(c.viewChangePct).toBe(100)
  })

  it("says nothing rather than infinity when last month was empty", () => {
    expect(compareMonths([at("2026-08-05T12:00:00Z")], now).viewChangePct).toBeNull()
  })

  it("steps back across a year boundary", () => {
    const c = compareMonths([at("2025-12-05T12:00:00Z")], new Date("2026-01-15T16:00:00Z"))
    expect(c.lastMonth.label).toBe("2025-12")
    expect(c.lastMonth.views).toBe(1)
  })
})

describe("findPowerUsers", () => {
  it("ranks by days active rather than raw views", () => {
    const rows = [
      // One long session: lots of views, one day.
      ...Array.from({ length: 20 }, () => at("2026-08-30T12:00:00Z", "binger")),
      // Fewer views spread over four days.
      at("2026-08-27T12:00:00Z", "regular"),
      at("2026-08-28T12:00:00Z", "regular"),
      at("2026-08-29T12:00:00Z", "regular"),
      at("2026-08-30T12:00:00Z", "regular"),
    ]
    const [first] = findPowerUsers(rows)
    expect(first.userId).toBe("regular")
    expect(first.activeDays).toBe(4)
  })

  it("ignores anonymous views", () => {
    expect(findPowerUsers([at("2026-08-30T12:00:00Z", null)])).toEqual([])
  })

  it("reports what each person mostly looks at", () => {
    const rows = [
      at("2026-08-30T12:00:00Z", "u1", "/tournament-of-champions"),
      at("2026-08-30T12:05:00Z", "u1", "/tournament-of-champions/field"),
      at("2026-08-30T12:10:00Z", "u1", "/clubs"),
    ]
    expect(findPowerUsers(rows)[0].topSection).toBe("toc")
  })

  it("keeps the most recent sighting", () => {
    const rows = [at("2026-08-01T12:00:00Z", "u1"), at("2026-08-30T12:00:00Z", "u1")]
    expect(findPowerUsers(rows)[0].lastSeen).toBe("2026-08-30T12:00:00Z")
  })
})

describe("summariseSections", () => {
  it("groups views by section, busiest first, with the pages behind them", () => {
    const rows = [
      at("2026-08-30T12:00:00Z", "u1", "/tournament-of-champions"),
      at("2026-08-30T12:01:00Z", "u2", "/tournament-of-champions"),
      at("2026-08-30T12:02:00Z", "u1", "/tournament-of-champions/field"),
      at("2026-08-30T12:03:00Z", "u1", "/clubs"),
    ]
    const [top] = summariseSections(rows)
    expect(top.section).toBe("toc")
    expect(top.views).toBe(3)
    expect(top.people).toBe(2)
    expect(top.topPaths[0]).toEqual({ path: "/tournament-of-champions", views: 2 })
  })
})

describe("buildDailySeries", () => {
  it("fills silent days with zeros rather than skipping them", () => {
    const series = buildDailySeries(
      [at("2026-08-28T15:00:00Z"), at("2026-08-30T15:00:00Z")],
      new Date("2026-08-28T15:00:00Z"),
      new Date("2026-08-30T15:00:00Z"),
    )
    expect(series.map((p) => p.day)).toEqual(["2026-08-28", "2026-08-29", "2026-08-30"])
    expect(series[1]).toEqual({ day: "2026-08-29", views: 0, people: 0 })
  })

  it("counts distinct people per day, not per range", () => {
    const series = buildDailySeries(
      [at("2026-08-28T15:00:00Z", "u1"), at("2026-08-28T16:00:00Z", "u1"), at("2026-08-28T17:00:00Z", "u2")],
      new Date("2026-08-28T15:00:00Z"),
      new Date("2026-08-28T18:00:00Z"),
    )
    expect(series[0]).toEqual({ day: "2026-08-28", views: 3, people: 2 })
  })
})

describe("buildInsights", () => {
  const now = new Date("2026-08-31T16:00:00Z")

  it("says nothing confident when there is nothing to say", () => {
    expect(buildInsights([], now)).toEqual([{ tone: "note", text: "No activity recorded yet." }])
  })

  it("leads with the month-on-month direction", () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => at(`2026-08-${String(i + 1).padStart(2, "0")}T12:00:00Z`, `u${i}`)),
      ...Array.from({ length: 5 }, (_, i) => at(`2026-07-${String(i + 1).padStart(2, "0")}T12:00:00Z`, `u${i}`)),
    ]
    expect(buildInsights(rows, now)[0]).toMatchObject({ tone: "up" })
    expect(buildInsights(rows, now)[0].text).toContain("100%")
  })

  it("will not compute a percentage off a base too small to mean anything", () => {
    // One view last month becoming three is not "up 200%" worth telling anybody.
    const rows = [
      at("2026-07-01T12:00:00Z", "u1", "/clubs"),
      at("2026-08-01T12:00:00Z", "u1", "/clubs"),
      at("2026-08-02T12:00:00Z", "u2", "/clubs"),
      at("2026-08-03T12:00:00Z", "u3", "/clubs"),
    ]
    expect(buildInsights(rows, now).some((i) => i.text.includes("grew fastest"))).toBe(false)
  })

  it("excludes admin from the fastest-growing claim", () => {
    const rows = [
      ...Array.from({ length: 30 }, (_, i) => at(`2026-07-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z`, "u1", "/admin")),
      ...Array.from({ length: 90 }, (_, i) => at(`2026-08-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z`, "u1", "/admin")),
    ]
    expect(buildInsights(rows, now).some((i) => i.text.includes("Admin") && i.text.includes("grew fastest"))).toBe(false)
  })
})
