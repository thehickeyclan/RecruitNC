import { describe, expect, it } from "vitest"
import { rollUpCollegeInterest, UNIDENTIFIED_PROGRAM, cutoffForRange } from "./admin-college-interest"

const row = (coachId: string, athleteId: string, athleteName: string, at: string) => ({
  coachId,
  athleteId,
  athleteName,
  at,
})

describe("rollUpCollegeInterest", () => {
  it("groups a college's looks by athlete and counts its coaches once", () => {
    const report = rollUpCollegeInterest(
      [
        row("c1", "a1", "Gavin Lopez", "2026-09-10T10:00:00Z"),
        row("c1", "a1", "Gavin Lopez", "2026-09-12T10:00:00Z"),
        row("c2", "a2", "Ayden Sumners", "2026-09-11T10:00:00Z"),
      ],
      new Map([
        ["c1", "Campbell University"],
        ["c2", "Campbell University"],
      ]),
    )

    expect(report.byCollege).toHaveLength(1)
    expect(report.byCollege[0]).toMatchObject({ college: "Campbell University", views: 3, coaches: 2 })
    expect(report.byCollege[0].athletes.map((a) => a.athleteName)).toEqual(["Gavin Lopez", "Ayden Sumners"])
    expect(report.totals).toEqual({ views: 3, colleges: 1, coaches: 2, athletes: 2 })
  })

  it("counts a coach we cannot place rather than dropping his view", () => {
    // A coach on Gmail has no .edu domain to read. The look happened, so it is counted — under
    // a label that says plainly that the program is unknown, never guessed at.
    const report = rollUpCollegeInterest([row("c9", "a1", "Gavin Lopez", "2026-09-10T10:00:00Z")], new Map([["c9", null]]))
    expect(report.byCollege[0].college).toBe(UNIDENTIFIED_PROGRAM)
    expect(report.totals.views).toBe(1)
  })

  it("ranks colleges by most recent look, not by volume", () => {
    const report = rollUpCollegeInterest(
      [
        row("c1", "a1", "Gavin Lopez", "2026-01-02T10:00:00Z"),
        row("c1", "a2", "Ayden Sumners", "2026-01-03T10:00:00Z"),
        row("c2", "a1", "Gavin Lopez", "2026-09-15T10:00:00Z"),
      ],
      new Map([
        ["c1", "Old Interest University"],
        ["c2", "Yesterday State"],
      ]),
    )
    expect(report.byCollege.map((c) => c.college)).toEqual(["Yesterday State", "Old Interest University"])
  })

  it("ranks athletes by how many different programs looked", () => {
    const report = rollUpCollegeInterest(
      [
        row("c1", "a1", "One Program", "2026-09-10T10:00:00Z"),
        row("c1", "a1", "One Program", "2026-09-11T10:00:00Z"),
        row("c1", "a1", "One Program", "2026-09-12T10:00:00Z"),
        row("c2", "a2", "Two Programs", "2026-09-10T10:00:00Z"),
        row("c3", "a2", "Two Programs", "2026-09-10T10:00:00Z"),
      ],
      new Map([
        ["c1", "Campbell University"],
        ["c2", "Appalachian State"],
        ["c3", "NC State"],
      ]),
    )
    // Three views from one program is less recruiting interest than two programs looking once.
    expect(report.byAthlete.map((a) => a.athleteName)).toEqual(["Two Programs", "One Program"])
    expect(report.byAthlete[0].colleges).toHaveLength(2)
  })

  it("skips a view whose athlete has no name", () => {
    const report = rollUpCollegeInterest(
      [{ coachId: "c1", athleteId: "a1", athleteName: null, at: "2026-09-10T10:00:00Z" }],
      new Map([["c1", "Campbell University"]]),
    )
    expect(report.totals.views).toBe(0)
    expect(report.byCollege).toEqual([])
  })
})

describe("cutoffForRange", () => {
  it("returns null for all-time so no date filter is applied", () => {
    expect(cutoffForRange("all")).toBeNull()
  })

  it("counts back from now for a window", () => {
    const now = new Date("2026-09-17T12:00:00Z")
    expect(cutoffForRange("last30", now)).toBe("2026-08-18T12:00:00.000Z")
  })
})
