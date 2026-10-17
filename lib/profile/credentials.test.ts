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

describe("the state names the championship", () => {
  /*
   * Both Carolinas run a 4A. "4A State Champion" on a profile that never says which state is a
   * credential a coach cannot read, and "NCHSAA 4A State Champion" on a South Carolina wrestler
   * is simply false — the SCHSL runs that championship.
   */
  it("labels a South Carolina placing SCHSL, not NCHSAA", () => {
    const labels = profileCredentials({
      stateRows: [row("SCHSL 4A State Championships", "Champion")],
      tocRows: [],
      tournamentRows: [],
      state: "SC",
    }).map((c) => c.label)
    expect(labels).toEqual(["SCHSL 4A State Champion · ’26"])
  })

  it("keeps North Carolina as it was when no state is passed", () => {
    const labels = profileCredentials({
      stateRows: [row("NCHSAA 4A State Championships", "Champion")],
      tocRows: [],
      tournamentRows: [],
    }).map((c) => c.label)
    expect(labels).toEqual(["NCHSAA 4A State Champion · ’26"])
  })

  it("names the independent-schools championship where he actually placed", () => {
    expect(
      profileCredentials({ stateRows: [row("NCISA State Championships", "2nd")], tocRows: [], tournamentRows: [] })
        .map((c) => c.label),
    ).toEqual(["NCISA State 2nd · ’26"])
    expect(
      profileCredentials({
        stateRows: [row("SCISA State Championships", "2nd")],
        tocRows: [],
        tournamentRows: [],
        state: "SC",
      }).map((c) => c.label),
    ).toEqual(["SCISA State 2nd · ’26"])
  })

  it("carries the state onto a USA Wrestling state title too", () => {
    const labels = profileCredentials({
      stateRows: [],
      tocRows: [],
      tournamentRows: [row("2026 SC Freestyle & Greco State Championships - 16U Boys Freestyle", "Champion")],
      state: "SC",
    }).map((c) => c.label)
    expect(labels).toEqual(["SC Freestyle State Champion · ’26"])
  })

  it("names a state we hold no association for by the state itself", () => {
    const labels = profileCredentials({
      stateRows: [row("Georgia 6A State Championships", "3rd")],
      tocRows: [],
      tournamentRows: [],
      state: "GA",
    }).map((c) => c.label)
    expect(labels).toEqual(["Georgia 6A State 3rd · ’26"])
  })
})
