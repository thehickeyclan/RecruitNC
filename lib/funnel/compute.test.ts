import { describe, expect, it } from "vitest"
import { applyFilters, awareness, coachActivity, completion, launchClock, stages, transition, type FunnelAthlete } from "./compute"

const base: FunnelAthlete = {
  id: "x",
  state: "NC",
  classYear: 2028,
  claimedAt: null,
  source: "unclaimed",
  gpa: false,
  cell: false,
  major: false,
  readyAt: null,
  insiderAt: null,
  commandCenterAt: null,
  activatedAt: null,
  blue: false,
  claimStartedAt: null,
  familyViews: 0,
  coachPrograms30: 0,
  firstCoachAt: null,
}
const a = (patch: Partial<FunnelAthlete>): FunnelAthlete => ({ ...base, ...patch })
const now = new Date("2026-11-30T00:00:00Z")

describe("stages", () => {
  it("counts recruiting-ready against claimed and leaves Blue out of paid", () => {
    const rows = [
      a({ id: "1" }),
      a({ id: "2", claimedAt: "2026-11-01", gpa: true, cell: true, major: true }),
      a({ id: "3", claimedAt: "2026-11-01", gpa: true, insiderAt: "2026-11-02" }),
      a({ id: "4", claimedAt: "2026-11-01", insiderAt: "2026-11-02", blue: true }),
    ]
    const s = Object.fromEntries(stages(rows).map((x) => [x.key, x]))
    expect(s.claimed.count).toBe(3)
    expect(s.ready).toMatchObject({ count: 1, of: 3 })
    expect(s.insider.count).toBe(1)
  })
})

describe("completion", () => {
  it("names the one field holding a profile back", () => {
    const c = completion([
      a({ claimedAt: "2026-11-01", gpa: true, cell: true }),
      a({ claimedAt: "2026-11-01", cell: true, major: true }),
      a({ claimedAt: "2026-11-01" }),
    ])
    expect(c).toMatchObject({ claimed: 3, onlyMajorMissing: 1, onlyGpaMissing: 1, onlyCellMissing: 0, noneOfThree: 1 })
  })
})

describe("transition", () => {
  it("only counts a window for those who have had that long", () => {
    const rows = [
      a({ claimedAt: "2026-11-01T00:00:00Z", insiderAt: "2026-11-01T12:00:00Z" }),
      a({ claimedAt: "2026-11-01T00:00:00Z", insiderAt: "2026-11-20T00:00:00Z" }),
      a({ claimedAt: "2026-11-29T12:00:00Z" }),
    ]
    const t = transition(rows, "t", (x) => x.claimedAt, (x) => x.insiderAt, (x) => x.insiderAt != null, now)
    expect(t.within[0]).toEqual({ days: 1, eligible: 2, reached: 1 })
    expect(t.within[2]).toEqual({ days: 30, eligible: 0, reached: 0 })
    expect(t.within[1]).toEqual({ days: 7, eligible: 2, reached: 1 })
    expect(t.medianDays).toBe(0.5)
  })

  it("counts a stage reached with no stored time as untimed, never timed", () => {
    const t = transition([a({ claimedAt: "2026-11-01", gpa: true, cell: true, major: true })], "t", (x) => x.claimedAt, (x) => x.readyAt, (x) => x.gpa && x.cell && x.major, now)
    expect(t).toMatchObject({ reached: 1, untimed: 1, medianDays: null })
  })
})

describe("filters and segments", () => {
  it("a source filter keeps only claims from that source", () => {
    const rows = [a({ source: "unclaimed" }), a({ claimedAt: "2026-11-01", source: "instagram" }), a({ claimedAt: "2026-11-01", source: "direct" })]
    expect(applyFilters(rows, { state: "all", classYear: "all", source: "instagram" })).toHaveLength(1)
  })

  it("splits awareness by state", () => {
    const w = awareness([a({ state: "SC", familyViews: 3 }), a({ state: "SC" }), a({ state: "NC", claimedAt: "2026-11-10", claimStartedAt: "2026-11-10" })], "2026-10-31")
    expect(w.find((x) => x.state === "SC")).toMatchObject({ profiles: 2, unclaimed: 2, viewedUnclaimed: 1, views: 3 })
    expect(w.find((x) => x.state === "NC")).toMatchObject({ claims: 1, claimStarts: 1 })
  })

  it("tells an Insider that followed coach interest from one that didn't", () => {
    const c = coachActivity([
      a({ claimedAt: "2026-11-01", insiderAt: "2026-11-05", firstCoachAt: "2026-11-02", coachPrograms30: 3 }),
      a({ claimedAt: "2026-11-01", insiderAt: "2026-11-05" }),
    ])
    expect(c).toMatchObject({ insider: 2, insiderAfterCoachActivity: 1, insiderWithoutCoachActivity: 1, threePrograms30: 1 })
  })
})

describe("launchClock", () => {
  const launch = { state: "SC" as const, announced: "2026-11-01", target: { claimsLow: 25, claimsHigh: 50, byDay: 30 } }
  it("counts claims since the announcement and leaves unreached checkpoints empty", () => {
    const rows = [
      a({ state: "SC", claimedAt: "2026-10-28T12:00:00Z", gpa: true, cell: true, major: true }),
      a({ state: "SC", claimedAt: "2026-11-02T12:00:00Z", gpa: true, cell: true, major: true }),
      a({ state: "SC", claimedAt: "2026-11-05T12:00:00Z" }),
      a({ state: "SC" }),
      a({ state: "NC", claimedAt: "2026-11-02T12:00:00Z" }),
    ]
    const c = launchClock(rows, launch, new Date("2026-11-10T12:00:00Z"))
    expect(c).toMatchObject({ day: 9, profiles: 4, claimedBefore: 1, claimedSince: 2, readySince: 1 })
    expect(c.checkpoints).toEqual([
      { day: 7, claims: 2, ready: 1 },
      { day: 30, claims: null, ready: null },
      { day: 60, claims: null, ready: null },
    ])
    expect(c.target.soFar).toBe(2)
  })
})
