import { describe, expect, it } from "vitest"

import { buildFeed, firstThreeActions, orderNeeds, type FeedInput } from "./whats-changed"

const NOW = "2026-11-02T15:00:00.000Z"
const daysAgo = (n: number) => new Date(Date.parse(NOW) - n * 864e5).toISOString()

const base = (over: Partial<FeedInput> = {}): FeedInput => ({
  firstName: "Jake",
  now: NOW,
  weight: 150,
  views: [],
  list: [],
  needs: [],
  threads: [],
  visits: [],
  reminders: [],
  listTarget: 20,
  upcomingEvents: 1,
  ...over,
})

const school = (id: string, contacted = false, savedAt = daysAgo(20)) => ({ id, name: id.toUpperCase(), level: "D1", status: "interested", contacted, savedAt })

describe("buildFeed", () => {
  it("counts programs viewed this week, one row each, and marks the ones on the list", () => {
    const f = buildFeed(
      base({
        list: [school("unc")],
        views: [
          { school: "UNC", schoolId: "unc", level: "D1", at: daysAgo(1) },
          { school: "UNC", schoolId: "unc", level: "D1", at: daysAgo(2) },
          { school: "Elon", schoolId: "elon", level: "D2", at: daysAgo(3) },
          { school: "Duke", schoolId: "duke", level: "D1", at: daysAgo(20) },
        ],
      }),
    )
    expect(f.window).toBe("week")
    expect(f.viewed.map((v) => [v.schoolId, v.views, v.onList])).toEqual([
      ["unc", 2, true],
      ["elon", 1, false],
    ])
  })

  it("falls back to the month when nobody looked this week", () => {
    const f = buildFeed(base({ list: [school("unc")], views: [{ school: "Duke", schoolId: "duke", level: "D1", at: daysAgo(20) }] }))
    expect(f.window).toBe("month")
    expect(f.viewed).toHaveLength(1)
  })

  it("puts coach-confirmed needs above inferred ones, one per school, and only for list schools", () => {
    const needs = orderNeeds([
      { schoolId: "a", name: "A", level: "D1", weight: 149, source: "inferred", line: "x" },
      { schoolId: "b", name: "B", level: "D2", weight: 157, source: "coach", line: "y" },
      { schoolId: "a", name: "A", level: "D1", weight: 149, source: "coach", line: "z" },
    ])
    expect(needs.map((n) => [n.schoolId, n.source])).toEqual([
      ["b", "coach"],
      ["a", "coach"],
    ])
    const f = buildFeed(base({ list: [school("a")], needs: [{ schoolId: "zzz", name: "Z", level: "D1", weight: 149, source: "inferred", line: "q" }] }))
    expect(f.needs).toEqual([])
  })

  it("shows no needs when no result records a weight", () => {
    const f = buildFeed(base({ weight: null, list: [school("a")], needs: [{ schoolId: "a", name: "A", level: "D1", weight: 149, source: "inferred", line: "q" }] }))
    expect(f.needs).toEqual([])
  })

  it("always gives exactly two actions, never two for one school", () => {
    const f = buildFeed(
      base({
        list: [school("unc"), school("elon")],
        views: [{ school: "UNC", schoolId: "unc", level: "D1", at: daysAgo(1) }],
        needs: [{ schoolId: "unc", name: "UNC", level: "D1", weight: 149, source: "inferred", line: "q" }],
      }),
    )
    expect(f.actions).toHaveLength(2)
    expect(f.actions[0].key).toBe("email:unc")
    expect(f.actions[1].key).toBe("email:elon")
  })

  it("puts a coach waiting on a reply first", () => {
    const f = buildFeed(base({ list: [school("unc")], threads: [{ id: "t1", program: "Campbell", unread: true, yourTurn: true, at: daysAgo(1) }] }))
    expect(f.actions[0]).toMatchObject({ key: "reply:t1", href: "/inbox/t1" })
  })

  it("still gives two actions when everything is done", () => {
    const f = buildFeed(base({ list: Array.from({ length: 20 }, (_, i) => school(`s${i}`, true)), upcomingEvents: 2 }))
    expect(f.actions.map((a) => a.key)).toEqual(["map", "rules"])
  })

  it("is empty for a new family with nothing saved, viewed or waiting", () => {
    expect(buildFeed(base()).empty).toBe(true)
    expect(buildFeed(base({ views: [{ school: "UNC", schoolId: "unc", level: "D1", at: daysAgo(1) }] })).empty).toBe(false)
  })

  it("never says him or her", () => {
    const f = buildFeed(base({ upcomingEvents: 0, list: [] }))
    for (const a of [...f.actions, ...firstThreeActions({ firstName: "Jake", athleteId: "x", upcomingEvents: 0, profilePercent: 50 })]) expect(`${a.label} ${a.why}`).not.toMatch(/\b(him|her|he|she|his)\b/i)
  })
})

describe("firstThreeActions", () => {
  it("asks for the next event before the profile", () => {
    expect(firstThreeActions({ firstName: "Jake", athleteId: "x", upcomingEvents: 0, profilePercent: 40 }).map((a) => a.key)).toEqual(["starter", "event", "rules"])
    expect(firstThreeActions({ firstName: "Jake", athleteId: "x", upcomingEvents: 1, profilePercent: 40 }).map((a) => a.key)).toEqual(["starter", "profile", "rules"])
  })
})
