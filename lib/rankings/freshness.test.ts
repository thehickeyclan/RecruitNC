import { describe, expect, it } from "vitest"
import { freshnessProblem, listLabel, type WatchedList } from "@/lib/rankings/freshness"

const oct = new Date("2026-10-06T12:00:00Z")
const ago = (days: number) => new Date(oct.getTime() - days * 86_400_000).toISOString()

const list = (over: Partial<WatchedList> = {}): WatchedList => ({
  source: "flowrestling",
  gender: "F",
  scope: "weight",
  editionClassYear: 0,
  lastCheckedAt: ago(0),
  lastChangedAt: ago(1),
  published: "2026-09-27",
  ...over,
})

describe("listLabel", () => {
  it("names the class a board covers, because two publish the same day", () => {
    expect(listLabel({ source: "matscouts", gender: "F", scope: "big_board", editionClassYear: 2028 })).toBe(
      "MatScouts girls Big Board class of 2028",
    )
  })

  it("leaves the class off a list that ranks every class at once", () => {
    expect(listLabel({ source: "sports_illustrated", gender: "M", scope: "weight", editionClassYear: 0 })).toBe(
      "Sports Illustrated boys",
    )
  })
})

describe("freshnessProblem", () => {
  it("says nothing about a list checked today with a recent edition", () => {
    expect(freshnessProblem(list(), oct)).toBeNull()
  })

  it("reports a check that has stopped before anything else", () => {
    expect(freshnessProblem(list({ lastCheckedAt: ago(5) }), oct)).toMatch(/not checked in 5 days/)
  })

  it("distinguishes an outlet whose newest list is last season's from one with nothing", () => {
    /*
     * These read identically before - both as no edition at all - so a real, nameable gap looked
     * like a broken pipeline. Flo's newest girls list ranks wrestlers who have since graduated.
     */
    const prior = freshnessProblem(list({ published: null, lastChangedAt: null, priorSeasonPublished: "2026-07-21" }), oct)
    expect(prior).toMatch(/newest list they have is last season's final \(2026-07-21\)/)
    expect(prior).toMatch(/since graduated/)

    const nothing = freshnessProblem(list({ published: null, lastChangedAt: null }), oct)
    expect(nothing).toMatch(/published no 2026-27 edition/)
    expect(nothing).not.toMatch(/last season's final/)
  })

  it("holds off until the season is actually underway, rather than alerting forever", () => {
    // A list with no edition has no last change, which read as infinitely stale: it alerted every
    // day from the first check, which is how a real gap turns into noise and stops being read.
    const september = new Date("2026-09-10T12:00:00Z")
    expect(freshnessProblem(list({ published: null, lastChangedAt: null, lastCheckedAt: september.toISOString() }), september)).toBeNull()
    const november = new Date("2026-11-10T12:00:00Z")
    expect(freshnessProblem(list({ published: null, lastChangedAt: null, lastCheckedAt: november.toISOString() }), november)).toMatch(
      /no 2026-27 edition . 70 days into the season/,
    )
  })

  it("still reports a list that published once and then went quiet", () => {
    expect(freshnessProblem(list({ lastChangedAt: ago(30) }), oct)).toMatch(/no new edition in 30 days \(last published 2026-09-27\)/)
  })
})
