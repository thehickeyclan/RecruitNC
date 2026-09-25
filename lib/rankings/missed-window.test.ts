import { describe, expect, it } from "vitest"
import { MAX_WINDOW_PENALTY, WINDOW_PARTICIPATION_FLOOR, describeMissedWindow, findClassWindows, isRosterLimitedWindow, missedWindowsFor, type ClassWindow } from "./missed-window"

const entries = (m: Record<string, string[]>) =>
  new Map(Object.entries(m).map(([k, v]) => [k, new Set(v)]))

describe("findClassWindows", () => {
  it("finds the event the class turned out for", () => {
    // The case this exists for: 34 of the Class of 2027 wrestled the TOC in September 2026.
    const map = entries({
      a: ["Tournament of Champions 2026", "NHSCA Nationals 2026"],
      b: ["Tournament of Champions 2026"],
      c: ["Tournament of Champions 2026"],
      d: ["NHSCA Nationals 2026"],
    })
    const windows = findClassWindows(map, { classSize: 4, seasons: [2026] })
    expect(windows[0].label).toBe("Tournament of Champions 2026")
    expect(windows[0].entrants).toBe(3)
    expect(windows[0].participation).toBeCloseTo(0.75)
  })

  it("ignores an event only a handful entered", () => {
    // One wrestler travelling to Journeymen does not make it a window the rest skipped.
    const map = entries({ a: ["Journeymen 2026"], b: [], c: [], d: [], e: [] })
    expect(findClassWindows(map, { classSize: 5, seasons: [2026] })).toEqual([])
  })

  it("only considers the seasons asked for", () => {
    const map = entries({ a: ["Super 32 2023"], b: ["Super 32 2023"], c: ["Super 32 2023"] })
    expect(findClassWindows(map, { classSize: 3, seasons: [2026] })).toEqual([])
  })
})

describe("missedWindowsFor", () => {
  const windows = [
    { label: "Tournament of Champions 2026", year: 2026, entrants: 34, classSize: 40, participation: 0.85 },
    { label: "NHSCA Nationals 2026", year: 2026, entrants: 18, classSize: 40, participation: 0.45 },
  ]

  it("charges most for the event nearly everyone entered", () => {
    // Missing both would come to 0.85 + 0.45 of the ceiling, so the pair is scaled back to it.
    // What the test is really about survives: the room the class turned out for costs the most,
    // and the two stay in proportion (0.85 : 0.45).
    const missed = missedWindowsFor(new Set(), windows)
    const total = missed.reduce((sum, m) => sum + m.penalty, 0)
    expect(total).toBeLessThanOrEqual(MAX_WINDOW_PENALTY)
    expect(missed[0].penalty).toBeGreaterThan(missed[1].penalty)
    // Rounding to whole points moves the ratio a little (20 and 10 against an exact 1.89), so
    // this asserts the proportion survives rather than a precise quotient.
    expect(missed[0].penalty / missed[1].penalty).toBeGreaterThan(1.5)
    expect(missed[0].penalty / missed[1].penalty).toBeLessThan(2.3)
  })

  it("does not scale a wrestler who only missed the one", () => {
    const missed = missedWindowsFor(new Set(["NHSCA Nationals 2026"]), windows)
    expect(missed[0].penalty).toBe(Math.round(MAX_WINDOW_PENALTY * 0.85))
  })

  it("charges nothing to a wrestler who was there", () => {
    const missed = missedWindowsFor(new Set(["Tournament of Champions 2026"]), windows)
    expect(missed.map((m) => m.label)).toEqual(["NHSCA Nationals 2026"])
  })

  it("stays lighter than a result is worth", () => {
    // A TOC title scores +52. Missing it must never cost more than winning it earns.
    const worst = missedWindowsFor(new Set(), [{ ...windows[0], participation: 1 }])
    expect(worst[0].penalty).toBeLessThan(52)
    expect(worst[0].penalty).toBe(MAX_WINDOW_PENALTY)
  })

  it("explains itself so a reviewer can overrule it", () => {
    // Mac Johnson missed the TOC after shoulder surgery. The board cannot know that; it can
    // state the fact plainly enough for a human to weigh.
    expect(describeMissedWindow(missedWindowsFor(new Set(), windows)[0])).toBe(
      "Did not enter Tournament of Champions 2026 — 34 of 40 in the class did",
    )
  })

  it("ignores an event a quarter of the class entered", () => {
    /*
     * Super 32 Early Entry drew 25 of 92 in the Class of 2027. At a 25% floor that charged 88
     * of 92 wrestlers for skipping a regional qualifier — a penalty almost everyone pays is
     * noise, not evidence.
     */
    const map = entries(Object.fromEntries(
      Array.from({ length: 92 }, (_, i) => [`a${i}`, i < 25 ? ["Super 32 Early Entry 2026"] : []]),
    ))
    expect(findClassWindows(map, { classSize: 92, seasons: [2026] })).toEqual([])
    expect(WINDOW_PARTICIPATION_FLOOR).toBe(0.4)
  })
})

describe("roster-limited events", () => {
  it("never become a missed window, however many of the class were there", () => {
    // One wrestler per weight per squad. A 152-pounder stays home because the weight was taken,
    // which is a lineup decision, not a choice about their season.
    const entries = new Map<string, Set<string>>()
    for (let i = 0; i < 9; i += 1) entries.set(`in-${i}`, new Set(["NHSCA Duals 2026", "Super 32 2026"]))
    entries.set("out", new Set<string>())

    const windows = findClassWindows(entries, { classSize: 10, seasons: [2026] })
    expect(windows.map((w) => w.label)).toEqual(["Super 32 2026"])
  })

  it("recognises the roster-limited events by name", () => {
    expect(isRosterLimitedWindow("NHSCA Duals 2026")).toBe(true)
    expect(isRosterLimitedWindow("Ultimate Club Duals 2025")).toBe(true)
    // The same event, spelled the way the outside-club results import writes it. Missing this
    // spelling would charge the thirty wrestlers who were there for not being there.
    expect(isRosterLimitedWindow("NHSCA National Duals 2026")).toBe(true)
    // Any duals meet is a team event with a lineup, so the word is the test rather than a list.
    expect(isRosterLimitedWindow("I-64 Spring Duals 2026")).toBe(true)
    expect(isRosterLimitedWindow("Tournament of Champions 2026")).toBe(false)
    // NHSCA Nationals is the open individual tournament, not the duals. It stays a window.
    expect(isRosterLimitedWindow("NHSCA Nationals 2026")).toBe(false)
    expect(isRosterLimitedWindow("NHSCA 2026")).toBe(false)
  })
})

describe("the total is capped, not just each window", () => {
  const window = (label: string, participation: number): ClassWindow => ({
    label, year: 2026, entrants: Math.round(participation * 100), classSize: 100, participation,
  })

  it("charges a quiet season once, however many rooms it spans", () => {
    // Christian Riddick carried 23 + 16 + 13 + 12 = 64, against a TOC title worth 52. An absence
    // cannot be the largest single force on the board.
    const missed = missedWindowsFor(new Set<string>(), [
      window("Super 32 Early Entry 2026", 0.77),
      window("NHSCA Nationals 2025", 0.53),
      window("Tournament of Champions 2026", 0.43),
      window("NHSCA Nationals 2026", 0.40),
    ])
    const total = missed.reduce((sum, w) => sum + w.penalty, 0)
    expect(total).toBeLessThanOrEqual(MAX_WINDOW_PENALTY)
  })

  it("keeps the proportions so a reviewer sees which room mattered most", () => {
    const missed = missedWindowsFor(new Set<string>(), [
      window("Super 32 Early Entry 2026", 0.8),
      window("NHSCA Nationals 2026", 0.4),
    ])
    expect(missed[0]!.penalty).toBeGreaterThan(missed[1]!.penalty)
    expect(missed.map((w) => w.label)).toEqual(["Super 32 Early Entry 2026", "NHSCA Nationals 2026"])
  })

  it("leaves a single missed window untouched", () => {
    const missed = missedWindowsFor(new Set<string>(), [window("Tournament of Champions 2026", 0.5)])
    expect(missed[0]!.penalty).toBe(15)
  })

  it("prices the same quiet season alike in a small class and a large one", () => {
    // Four windows clear the floor in 2028 and one in 2029. The wrestler who entered nothing
    // should not be charged three times as much for being in the smaller class.
    const small = missedWindowsFor(new Set<string>(), [
      window("a 2026", 0.9), window("b 2026", 0.8), window("c 2026", 0.7), window("d 2026", 0.6),
    ]).reduce((s, w) => s + w.penalty, 0)
    const large = missedWindowsFor(new Set<string>(), [window("a 2026", 0.9)]).reduce((s, w) => s + w.penalty, 0)
    expect(small).toBeLessThanOrEqual(MAX_WINDOW_PENALTY)
    expect(small - large).toBeLessThan(MAX_WINDOW_PENALTY / 2)
  })
})
