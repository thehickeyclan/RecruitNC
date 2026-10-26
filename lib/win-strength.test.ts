import { describe, expect, it } from "vitest"
import { divisionFactor, newestFirst, recordStrength, topWins, winDate, winStrength } from "./win-strength"

const NOW = Date.UTC(2026, 9, 26)

/** Jacob Perry's wins as his profile prints them (26 October 2026). */
const JACOB = [
  { opponent: "Jin Davis", credential: "GA State Champion · 2x GA State Placer", date: "9/5/2026" },
  { opponent: "Braelyn Nelson", credential: "GA State Runner-up · 2x GA State Placer", date: "9/5/2026" },
  { opponent: "Ty Eversman", credential: "#24 Sports Illustrated (150) · 2026 CO 4A State Champion", date: "2026-10-24" },
  { opponent: "Travis Nobles", credential: "NC ranked · 2026 NCHSAA 4A State 4th", date: "2026-09-18" },
  { opponent: "Aiden Campbell", credential: "NC ranked · 2026 NCHSAA 5A State Champion", date: "1/10/2026" },
  { opponent: "Ryder Allen", credential: "2026 VA VISAA State Champion", date: "12/13/2025" },
  { opponent: "Nicolas Barrett", credential: "2026 NHSCA All-American (8th, 160)", date: "2026-10-24" },
  { opponent: "Aiden Campbell", credential: "2026 NCHSAA 5A State Champion", date: "2025-10-04" },
  { opponent: "Xander Nielsen", credential: "2025 GA 3A State Champion", date: "2025-03-28" },
]

describe("top 5 wins", () => {
  it("orders Jacob Perry's top three the way Matt set it", () => {
    // Ranked first; then the GA champion ahead of the NHSCA 8th (Matt, 26 October 2026).
    expect(topWins(JACOB, NOW).map((w) => w.opponent).slice(0, 3)).toEqual(["Ty Eversman", "Jin Davis", "Nicolas Barrett"])
  })

  it("orders Jake Amiott's by division, not just state and place", () => {
    // His opponents' records as the results hold them (26 October 2026). The first version put an
    // Ohio Division III runner-up 3rd and took an NC 3A champion over an 8A one on date alone.
    const r = (opponent: string, record: Parameters<typeof recordStrength>[0]) => ({ opponent, date: "2026-07-15", strength: recordStrength(record, 2026) })
    const jake = [
      r("Lukas Boxley", { stateFinishes: [{ year: 2026, place: 1, classification: "Open", state: "CT" }, { year: 2025, place: 2, classification: "Open", state: "CT" }], eventFinishes: [{ event: "NHSCA", year: 2026, place: 2 }] }),
      r("Micah Engelman", { eventFinishes: [{ event: "NHSCA", year: 2026, place: 5 }] }),
      r("Gavin Cantera", { stateFinishes: [{ year: 2026, place: 2, classification: "Division III", state: "OH" }] }),
      r("Ethan Bosco", { eventFinishes: [{ event: "NHSCA", year: 2026, place: 8 }] }),
      r("Michael Fischer", { stateFinishes: [{ year: 2026, place: 1, classification: "3A" }] }),
      r("Abdul-Jamil Zaggout", { stateFinishes: [{ year: 2026, place: 1, classification: "8A" }] }),
      r("Nate Keller", { stateFinishes: [{ year: 2026, place: 4, classification: "Open", state: "NJ" }] }),
      r("Xander Courneya", { stateFinishes: [{ year: 2026, place: 3, classification: "Division 1", state: "MI" }, { year: 2025, place: 4, classification: "Division 1", state: "MI" }] }),
    ]
    expect(topWins(jake, NOW).map((w) => w.opponent)).toEqual(["Lukas Boxley", "Nate Keller", "Micah Engelman", "Xander Courneya", "Abdul-Jamil Zaggout"])
  })

  it("counts only the last 12 months", () => {
    const names = topWins(JACOB, NOW, 20).map((w) => w.opponent)
    expect(names).not.toContain("Xander Nielsen")
  })

  it("keeps one win per opponent", () => {
    expect(topWins(JACOB, NOW, 20).filter((w) => w.opponent === "Aiden Campbell")).toHaveLength(1)
  })

  it("puts a higher national rank first", () => {
    expect(winStrength("#13 MatScouts (106)", 2026)).toBeGreaterThan(winStrength("#17 Sports Illustrated (106)", 2026))
  })

  it("does not read 'State Championship' as a title", () => {
    // Kentucky runs one bracket: the line is a 3rd place, scored as one.
    expect(winStrength("2025 KY KHSAA / State Championship State 3rd", 2026)).toBe(winStrength("2025 KY Open State 3rd", 2026))
  })
})

describe("divisions", () => {
  it("counts a one-bracket state most and the smallest division least", () => {
    expect(divisionFactor("NJ", "Open", 2026)).toBeGreaterThan(divisionFactor("MI", "Division 1", 2026))
    expect(divisionFactor("MI", "Division 1", 2026)).toBeGreaterThan(divisionFactor("MI", "Division 4", 2026))
    expect(divisionFactor("OH", "Division III", 2026)).toBeCloseTo(0.7)
    expect(divisionFactor("MN", "AAA", 2026)).toBeGreaterThan(divisionFactor("MN", "A", 2026))
    expect(divisionFactor("NE", "A", 2026)).toBeGreaterThan(divisionFactor("NE", "D", 2026))
    expect(divisionFactor("WA", "4A", 2026)).toBeGreaterThan(divisionFactor("WA", "1B/2B", 2026))
  })

  it("knows NC went from four classes to seven brackets in 2026", () => {
    expect(divisionFactor("NC", "4A", 2025)).toBeCloseTo(0.92)
    expect(divisionFactor("NC", "4A", 2026)).toBeLessThan(0.8)
    expect(divisionFactor("NC", "8A", 2026)).toBeCloseTo(0.92)
  })

  it("sets private-school associations and unreadable divisions apart", () => {
    expect(divisionFactor("VA", "VISAA", 2026)).toBe(0.8)
    expect(divisionFactor("GA", null, 2026)).toBe(0.85)
    expect(divisionFactor("IN", null, 2026)).toBe(1.1)
  })

  it("reads the division off a printed line", () => {
    expect(winStrength("2026 NCHSAA 8A State Champion", 2026)).toBeGreaterThan(winStrength("2026 NCHSAA 3A State Champion", 2026))
    expect(winStrength("2026 NJ Open State 4th", 2026)).toBeGreaterThan(winStrength("2026 OH Division III State Runner-up", 2026))
  })
})

describe("dates", () => {
  it("reads every format the profile carries", () => {
    expect(winDate("2026-10-24")).toBe(Date.UTC(2026, 9, 24))
    expect(winDate("1/10/2026")).toBe(Date.UTC(2026, 0, 10))
    expect(winDate("12/20 - 12/21/2024")).toBe(Date.UTC(2024, 11, 21))
    expect(Number.isNaN(winDate(null))).toBe(true)
  })

  it("lists newest first with undated wins last", () => {
    const list = newestFirst([
      { opponent: "a", date: null },
      { opponent: "b", date: "1/10/2026" },
      { opponent: "c", date: "2026-10-24" },
    ])
    expect(list.map((w) => w.opponent)).toEqual(["c", "b", "a"])
  })
})
