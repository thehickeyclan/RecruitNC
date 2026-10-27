import { describe, expect, it } from "vitest"
import { freshSeen, markSeen, navNewCounts, type NavNewFeed } from "./nav-new"

const now = new Date("2026-10-27T15:00:00Z")
const feed: NavNewFeed = {
  reports: [
    { slug: "super32-2026-mens", date: "2026-10-25" },
    { slug: "super32-2026-sc-mens", date: "2026-10-25" },
    { slug: "old-report", date: "2026-08-01" },
  ],
  rankingsPublishedAt: "2026-10-20T18:00:00Z",
  newsDate: "2026-10-26",
}

describe("navNewCounts", () => {
  it("a first visit counts only the last two weeks", () => {
    expect(navNewCounts(feed, freshSeen(now))).toEqual({ reports: 2, rankings: true, news: true })
  })
  it("opening a report clears that one", () => {
    const seen = markSeen(freshSeen(now), "/coach-reports/super32-2026-mens", now)
    expect(navNewCounts(feed, seen).reports).toBe(1)
  })
  it("visiting rankings or news clears them until the next release", () => {
    let seen = markSeen(freshSeen(now), "/public-rankings", now)
    seen = markSeen(seen, "/recaps", now)
    expect(navNewCounts(feed, seen)).toMatchObject({ rankings: false, news: false })
    expect(navNewCounts({ ...feed, rankingsPublishedAt: "2026-10-28T09:00:00Z" }, seen).rankings).toBe(true)
  })
  it("other pages change nothing", () => {
    const seen = freshSeen(now)
    expect(markSeen(seen, "/my-recruits", now)).toBe(seen)
    expect(markSeen(seen, "/coach-reports", now)).toBe(seen)
  })
})
