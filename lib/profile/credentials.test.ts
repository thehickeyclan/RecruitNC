import { describe, expect, it } from "vitest"
import { profileCredentials } from "./credentials"
import type { TournamentRow } from "./tournament-rows"

const row = (event: string, placement: string | null, year = 2026, extra: Partial<TournamentRow> = {}): TournamentRow => ({
  id: event, event, team: null, isDuals: false, year, sortKey: String(year), weight: null, placement, record: null, entrants: null, bouts: [], ...extra,
})

describe("profileCredentials", () => {
  it("names each finish in full, national first, and skips overflow, duals and qualifiers", () => {
    const labels = profileCredentials({
      stateRows: [row("NCHSAA 7A State Championships", "4th"), row("NCHSAA 4A State Championships", "State Qualifier", 2025)],
      tocRows: [row("NC United Tournament of Champions", "2nd")],
      tournamentRows: [
        row("Fargo · Freestyle", "8th All-American"),
        row("Journeymen Fall Classic (OF)", "2nd", 2025),
        row("2026 NHSCA National Duals", "6-3", 2026, { isDuals: true }),
        row("2026 NC Freestyle & Greco State Championships - 16U Boys Freestyle", "Champion"),
        row("2026 Tar Heel State Classic - 16U Boys Freestyle", "Champion"),
      ],
    }).map((c) => [c.title, c.detail])
    expect(labels).toEqual([
      ["Fargo Freestyle", "8th · All-American · ’26"],
      ["TOC", "2nd · ’26"],
      ["NC Freestyle State", "Champion · ’26"],
      ["NCHSAA 7A State", "4th · ’26"],
    ])
  })

  it("puts best finishes first: All-Americans, TOC, state titles, then other national placings", () => {
    const labels = profileCredentials({
      stateRows: [row("NCHSAA 8A State Championships", "Champion"), row("NCHSAA 4A State Championships", "Champion", 2025)],
      tocRows: [row("NC United Tournament of Champions", "Champion")],
      tournamentRows: [
        row("Super 32 Early Entry", "2nd"),
        row("Journeymen Fall Classic", "6th"),
        row("2026 NHSCA National Championships", "5th"),
        row("2025 NHSCA National Championships", "6th", 2025),
      ],
      max: 4,
    }).map((c) => c.label)
    expect(labels).toEqual([
      "NHSCA Nationals 5th · All-American · ’26",
      "NHSCA Nationals 6th · All-American · ’25",
      "TOC Champion · ’26",
      "NCHSAA 8A State Champion · ’26",
    ])
  })
})
