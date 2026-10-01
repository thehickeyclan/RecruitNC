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
