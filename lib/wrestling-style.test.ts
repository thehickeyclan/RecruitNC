import { describe, expect, it } from "vitest"
import { competitionLine, isNationalEvent, styleOfEvent, stylesLine, summarizeCompetition } from "./wrestling-style"

describe("styleOfEvent", () => {
  it("reads freestyle and Greco from the event, and everything else as folkstyle", () => {
    expect(styleOfEvent("2026 Fargo Junior Greco-Roman")).toBe("greco")
    expect(styleOfEvent("Fargo · Freestyle")).toBe("freestyle")
    expect(styleOfEvent("Fargo")).toBe("freestyle")
    expect(styleOfEvent("Fargo", "16U Boys Greco-Roman")).toBe("greco")
    expect(styleOfEvent("2026 NHSCA High School Nationals")).toBe("folkstyle")
    expect(styleOfEvent("NCHSAA States")).toBe("folkstyle")
    expect(styleOfEvent(null)).toBe("folkstyle")
    // The division decides when the event's name mentions both styles.
    expect(styleOfEvent("2026 NC Freestyle & Greco State Championships - 16U Boys Freestyle")).toBe("freestyle")
    expect(styleOfEvent("2026 NC Freestyle & Greco State Championships - Junior Boys Greco", "NC Freestyle & Greco State Championships")).toBe("greco")
  })
})

describe("summarizeCompetition", () => {
  it("says North Carolina only for a season and state finish", () => {
    const s = summarizeCompetition(["NCHSAA States", "Tournament of Champions"], true)
    expect(s.scope).toBe("in-state")
    expect(competitionLine(s)).toBe("North Carolina only")
    expect(stylesLine(s)).toBe("Folkstyle")
  })

  it("names the national events and every style, folkstyle first", () => {
    const s = summarizeCompetition(["2026 Fargo Junior Greco-Roman", "NHSCA Nationals", "Fargo · Freestyle", "NCHSAA States"], true)
    expect(s.scope).toBe("national")
    expect(s.nationalEvents).toEqual(["Fargo", "NHSCA Nationals"])
    expect(stylesLine(s)).toBe("Folkstyle, Freestyle, Greco-Roman")
  })

  it("does not count the Croatan tournament that borrowed the Beast of the East name", () => {
    expect(isNationalEvent("Beast Of The East @ Croatan")).toBe(false)
    expect(isNationalEvent("Beast of the East")).toBe(true)
  })
})

describe("events that never name their style", () => {
  it("files Tar Heel, the U.S. Open and the Southeast Regional as freestyle", () => {
    expect(styleOfEvent("Tar Heel State Classic")).toBe("freestyle")
    expect(styleOfEvent("2026 U.S. Open Event: (U17)")).toBe("freestyle")
    expect(styleOfEvent("Frank E. Rader Southeast Regional Championships")).toBe("freestyle")
    expect(styleOfEvent("2026 Tar Heel State Classic - 16U Boys Greco")).toBe("greco")
    expect(styleOfEvent("NHSCA Nationals")).toBe("folkstyle")
    expect(styleOfEvent("2026 NHSCA National Duals")).toBe("folkstyle")
  })
})
