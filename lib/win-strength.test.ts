import { describe, expect, it } from "vitest"
import { newestFirst, topWins, winDate, winStrength } from "./win-strength"

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
  it("orders Jacob Perry's the way Matt set it", () => {
    expect(topWins(JACOB, NOW).map((w) => w.opponent)).toEqual([
      "Ty Eversman",
      "Jin Davis",
      "Nicolas Barrett",
      "Aiden Campbell",
      "Ryder Allen",
    ])
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
    expect(winStrength("2025 KY KHSAA / State Championship State 3rd", 2026)).toBeLessThan(winStrength("2026 KY 3A State Champion", 2026))
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
