import { describe, expect, it } from "vitest"
import { freshSeen, markSeen, navNewCounts, releaseIsRead, type NavNewFeed } from "./nav-new"

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

describe("releaseIsRead", () => {
  const rel = { id: "rankings:SC:2027:Male:x", kind: "rankings" as const, title: "", link: "", at: "2026-10-26T10:00:00Z" }
  it("is unread until ticked or its page is opened", () => {
    const seen = freshSeen(now)
    expect(releaseIsRead(rel, seen, [])).toBe(false)
    expect(releaseIsRead(rel, seen, [rel.id])).toBe(true)
    expect(releaseIsRead(rel, markSeen(seen, "/public-rankings/2027", now), [])).toBe(true)
  })
  it("anything before tracking began is read", () => {
    expect(releaseIsRead({ ...rel, at: "2026-09-01T00:00:00Z" }, freshSeen(now), [])).toBe(true)
  })
  it("a report reads when opened", () => {
    const r = { id: "report:a", kind: "report" as const, title: "", link: "", at: "2026-10-25", slug: "a" }
    expect(releaseIsRead(r, freshSeen(now), [])).toBe(false)
    expect(releaseIsRead(r, markSeen(freshSeen(now), "/coach-reports/a", now), [])).toBe(true)
  })
})
