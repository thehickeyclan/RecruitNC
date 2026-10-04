import { describe, expect, it } from "vitest"
import { competitionLine, isNationalEvent, styleOfEvent, styleOfEventForAthlete, stylesLine, summarizeCompetition } from "./wrestling-style"

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

describe("style order follows the wrestler", () => {
  const events = ["NCHSAA States", "2026 Fargo 16U Women's Freestyle", "NC Freestyle & Greco State Championships"]

  it("leads with folkstyle for a boy — the NCHSAA season and NHSCA are the sport", () => {
    expect(summarizeCompetition(events, true, "Male").styles[0]).toBe("folkstyle")
  })

  it("leads with freestyle for a girl — college women's wrestling is freestyle", () => {
    expect(summarizeCompetition(events, true, "Female").styles[0]).toBe("freestyle")
  })

  it("keeps folkstyle first when no gender is known, as before", () => {
    expect(summarizeCompetition(events, true).styles[0]).toBe("folkstyle")
  })
})

describe("styleOfEventForAthlete", () => {
  it("is freestyle for a woman everywhere except the state series and NHSCA (Matt)", () => {
    expect(styleOfEventForAthlete("NCHSAA State Championships", null, "Female")).toBe("folkstyle")
    expect(styleOfEventForAthlete("NCHSAA Women's 7A East Regional", null, "Female")).toBe("folkstyle")
    expect(styleOfEventForAthlete("2026 NHSCA High School Nationals", null, "Female")).toBe("folkstyle")
    expect(styleOfEventForAthlete("2026 NHSCA National Duals", null, "Female")).toBe("folkstyle")
    expect(styleOfEventForAthlete("2025 Super 32", null, "Female")).toBe("freestyle")
    expect(styleOfEventForAthlete("2026 Ultimate Club Duals", "NC Gold", "Female")).toBe("freestyle")
  })

  it("leaves the men's defaults alone", () => {
    expect(styleOfEventForAthlete("2025 Super 32", null, "Male")).toBe("folkstyle")
    expect(styleOfEventForAthlete("2026 Ultimate Club Duals", "NC United", "Male")).toBe("folkstyle")
  })

  it("keeps an in-season high-school meet folkstyle for a woman", () => {
    // Her season is folkstyle, so turning a county invitational freestyle is the same error in
    // reverse. Only a national or off-season event is freestyle by default.
    expect(styleOfEventForAthlete("Jolly Roger Invitational", null, "Female")).toBe("folkstyle")
  })

  it("never overrides a style the event names", () => {
    expect(styleOfEventForAthlete("2026 Fargo 16U Greco-Roman", null, "Female")).toBe("greco")
    expect(styleOfEventForAthlete("2026 Fargo 16U Women's Freestyle", null, "Female")).toBe("freestyle")
  })

  it("falls back to the event's own default with no gender on file", () => {
    expect(styleOfEventForAthlete("2026 Ultimate Club Duals", "NC Gold", null)).toBe("folkstyle")
  })
})
