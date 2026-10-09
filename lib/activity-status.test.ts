import { describe, expect, it } from "vitest"
import { activityStatus, lastCompletedSeasonStart } from "./activity-status"

const OCT_9 = new Date(Date.UTC(2026, 9, 9))

describe("lastCompletedSeasonStart", () => {
  it("rolls over once States are done", () => {
    expect(lastCompletedSeasonStart(OCT_9)).toBe(2025)
    expect(lastCompletedSeasonStart(new Date(Date.UTC(2027, 0, 15)))).toBe(2025)
    expect(lastCompletedSeasonStart(new Date(Date.UTC(2027, 2, 2)))).toBe(2026)
  })
})

describe("activityStatus", () => {
  it("does not flag a healthy wrestler in the off-season", () => {
    const s = activityStatus(
      { last: { event: "NCHSAA State Championships", date: "2026-02-21" }, graduationYear: 2027, seasonsWithBouts: ["2025-26"], stateYears: [2026] },
      OCT_9,
    )
    expect(s.daysAgo).toBe(230)
    expect(s.label).toBe("230 days ago")
    expect(s.lastEvent).toBe("NCHSAA State Championships, Feb 21, 2026")
    expect(s.flags).toEqual([])
  })

  it("flags a year with nothing on file", () => {
    const s = activityStatus({ last: { event: "Fargo", date: "2025-07-15" }, graduationYear: 2027, seasonsWithBouts: ["2024-25"], stateYears: [] }, OCT_9)
    expect(s.flags).toEqual(["No results on file in the last 12 months"])
  })

  it("flags a missed season for a wrestler whose seasons we import", () => {
    const s = activityStatus(
      { last: { event: "Ultimate Club Duals", date: "2026-09-19" }, graduationYear: 2027, seasonsWithBouts: ["2024-25"], stateYears: [2025] },
      OCT_9,
    )
    expect(s.flags).toEqual(["No results on file from the 2025-26 NC season"])
  })

  it("never reads a gap in our imports as an injury", () => {
    const s = activityStatus({ last: { event: "Ultimate Club Duals", date: "2026-09-19" }, graduationYear: 2027, seasonsWithBouts: [], stateYears: [] }, OCT_9)
    expect(s.flags).toEqual([])
  })

  it("does not expect a high school season from an eighth grader", () => {
    const s = activityStatus({ last: { event: "Fargo", date: "2026-07-15" }, graduationYear: 2030, seasonsWithBouts: ["2026-27"], stateYears: [] }, OCT_9)
    expect(s.flags).toEqual([])
  })

  it("says so when nothing is on file at all", () => {
    expect(activityStatus({ last: null, graduationYear: 2027, seasonsWithBouts: [], stateYears: [] }, OCT_9)).toMatchObject({
      daysAgo: null,
      label: "No results on file",
      flags: ["No results on file"],
    })
  })
})
