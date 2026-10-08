import { describe, expect, it } from "vitest"
import { datedMeetingsAgainst, isForfeitResult } from "@/lib/head-to-head"
import { isGrecoEvent } from "@/lib/rankings/recruitnc-ranking-engine"

describe("on the women's board a forfeit is not a head-to-head meeting (Matt, 8 October 2026)", () => {
  it("recognises every forfeit spelling in the data", () => {
    for (const code of ["For.", "For", "FF", "FOR", "Forfeit", "M FOR", "M. For.", "MFF", "MFFL", "MFL", "VFO"]) {
      expect(isForfeitResult(code), code).toBe(true)
    }
  })

  it("keeps results where the match started", () => {
    for (const code of ["Fall", "Dec", "TF", "MD", "Inj.", "INJ", "DQ", "Def.", "VIN", "SV-1"]) {
      expect(isForfeitResult(code), code).toBe(false)
    }
  })

  it("drops a forfeit from the meetings between two wrestlers", () => {
    const meetings = datedMeetingsAgainst(
      [
        { opponent: "Riley Johnson", win_loss: "W", result: "For.", date: "2/1/2026" },
        { opponent: "Riley Johnson", win_loss: "L", result: "TF", date: "2/8/2026" },
      ],
      "Riley Johnson",
      false,
      { skipForfeits: true },
    )
    expect(meetings).toHaveLength(1)
    expect(meetings[0]!.won).toBe(false)
  })

  it("leaves the boys' board and TOC seeding counting forfeits as before", () => {
    const meetings = datedMeetingsAgainst([{ opponent: "Riley Johnson", win_loss: "W", result: "For.", date: "2/1/2026" }], "Riley Johnson")
    expect(meetings).toHaveLength(1)
  })
})

describe("Greco events, left off the women's board", () => {
  it("are found by key or by a Greco division name", () => {
    expect(isGrecoEvent("rader-southeast-regional-2026-junior-girls-gr", "")).toBe(true)
    expect(isGrecoEvent("", "2026 Tar Heel State Classic - 16U Girls Greco")).toBe(true)
    expect(isGrecoEvent("", "2026 Women's National Duals - 16U Girls Greco-Roman")).toBe(true)
  })

  it("are not the freestyle half of a freestyle-and-Greco championship", () => {
    expect(isGrecoEvent("nc-usaw-states-2026-junior-girls-fs", "2026 NC Freestyle & Greco State Championships - Junior Girls Freestyle")).toBe(false)
    expect(isGrecoEvent("us-open-girls-hs-showcase-2026", "U.S. Open")).toBe(false)
  })
})
