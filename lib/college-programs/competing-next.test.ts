import { describe, expect, it } from "vitest"

import { easternToday, groupRecruitsByEvent, isOnBetween, isStillOn, weekendBody, weekendEnd } from "./competing-next"

const recruit = (id: string, name: string) => ({ id, name, classYear: 2028, weight: "132", highSchool: "Cardinal Gibbons" })

describe("competing next", () => {
  it("takes today from North Carolina, not UTC", () => {
    // 01:30 UTC on the 25th is still the evening of the 24th in Raleigh.
    expect(easternToday(new Date("2026-10-25T01:30:00Z"))).toBe("2026-10-24")
    expect(easternToday(new Date("2026-10-25T15:00:00Z"))).toBe("2026-10-25")
  })

  it("keeps a tournament through its last day and drops it the day after", () => {
    const super32 = { startDate: "2026-10-24", endDate: "2026-10-25" }
    expect(isStillOn(super32, "2026-10-23")).toBe(true)
    expect(isStillOn(super32, "2026-10-25")).toBe(true)
    expect(isStillOn(super32, "2026-10-26")).toBe(false)
    expect(isStillOn({ startDate: "2026-11-01", endDate: null }, "2026-11-01")).toBe(true)
  })

  it("groups a coach's recruits under one event however each family typed it", () => {
    const recruits = new Map([
      ["a", recruit("a", "Gavin Hickey")],
      ["b", recruit("b", "Aiden White")],
      ["c", recruit("c", "Tye Johnson")],
    ])
    const events = groupRecruitsByEvent(
      [
        { athleteId: "a", title: "Super 32", startDate: "2026-10-24", endDate: null, location: null },
        { athleteId: "b", title: "Super32", startDate: "2026-10-24", endDate: "2026-10-25", location: "Greensboro, NC" },
        { athleteId: "c", title: "Holy Angels Invitational", startDate: "2026-12-19", endDate: null, location: null },
        { athleteId: "zz", title: "Super 32", startDate: "2026-10-24", endDate: null, location: null },
      ],
      recruits,
    )
    expect(events.map((e) => [e.title, e.recruits.map((r) => r.name)])).toEqual([
      ["Super 32", ["Aiden White", "Gavin Hickey"]],
      ["Holy Angels Invitational", ["Tye Johnson"]],
    ])
    // What one family left out, another filled in.
    expect(events[0]).toMatchObject({ endDate: "2026-10-25", location: "Greensboro, NC" })
  })

  it("does not put the same wrestler on an event twice", () => {
    const recruits = new Map([["a", recruit("a", "Gavin Hickey")]])
    const events = groupRecruitsByEvent(
      [
        { athleteId: "a", title: "Super 32", startDate: "2026-10-24", endDate: null, location: null },
        { athleteId: "a", title: "SUPER 32", startDate: "2026-10-24", endDate: null, location: null },
      ],
      recruits,
    )
    expect(events[0].recruits).toHaveLength(1)
  })
})

describe("coach alerts for where recruits compete (20 Oct 2026)", () => {
  it("this weekend runs from today through Sunday", () => {
    expect(weekendEnd("2026-10-22")).toBe("2026-10-25") // Thursday
    expect(weekendEnd("2026-10-25")).toBe("2026-10-25") // Sunday
    expect(weekendEnd("2026-10-26")).toBe("2026-11-01") // Monday
  })
  it("an event is on this weekend when it overlaps today to Sunday", () => {
    expect(isOnBetween({ startDate: "2026-10-24", endDate: "2026-10-25" }, "2026-10-22", "2026-10-25")).toBe(true)
    expect(isOnBetween({ startDate: "2026-10-31", endDate: null }, "2026-10-22", "2026-10-25")).toBe(false)
    expect(isOnBetween({ startDate: "2026-10-20", endDate: "2026-10-21" }, "2026-10-22", "2026-10-25")).toBe(false)
  })
  it("the lock-screen line names events and wrestlers, briefly", () => {
    const r = (id: string, name: string) => ({ id, name, classYear: null, weight: null, highSchool: null })
    const ev = (title: string, recruits: ReturnType<typeof r>[]) => ({ title, startDate: "2026-10-24", endDate: null, location: null, recruits })
    expect(weekendBody([ev("Super 32", [r("1", "Brieon Mayfield"), r("2", "Naylor Higgins"), r("3", "Carson Worrick")]), ev("Journeymen", [r("4", "Aaron Ruiz-Angel")])])).toBe(
      "Super 32: Brieon Mayfield, Naylor Higgins +1 · Journeymen: Aaron Ruiz-Angel",
    )
  })
})

describe("one event typed with different dates", () => {
  it("Super 32 on the 23rd and the 24th is one event; the same title a year on is not", () => {
    const r = (id: string) => ({ id, name: id, classYear: null, weight: null, highSchool: null })
    const recruits = new Map([["a", r("a")], ["b", r("b")], ["c", r("c")]])
    const rows = [
      { athleteId: "a", title: "Super 32", startDate: "2026-10-24", endDate: "2026-10-25", location: null },
      { athleteId: "b", title: "Super32", startDate: "2026-10-23", endDate: "2026-10-25", location: "Greensboro" },
      { athleteId: "c", title: "Super 32", startDate: "2027-10-23", endDate: null, location: null },
    ]
    const g = groupRecruitsByEvent(rows, recruits)
    expect(g).toHaveLength(2)
    expect(g[0]).toMatchObject({ startDate: "2026-10-23", location: "Greensboro" })
    expect(g[0].recruits.map((x) => x.id)).toEqual(["a", "b"])
  })
})
