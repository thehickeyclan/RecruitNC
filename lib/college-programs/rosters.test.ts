import { describe, expect, it } from "vitest"

import { rosterForSchool, rosterNameKey } from "./rosters"

// Expected numbers are the workbook's own (rosters pulled 12 Oct 2026).
describe("NC wrestlers on college rosters", () => {
  it("says how many of a roster are from North Carolina", () => {
    const app = rosterForSchool("appalachian-state-university")
    expect(app.wrestlers).toHaveLength(9)
    expect(app.teamLines).toEqual(["9 of the 30 wrestlers on the 2026-27 roster are from North Carolina."])
  })

  it("says none when it read the roster and found none", () => {
    expect(rosterForSchool("arizona-state-university").teamLines).toEqual(["None of the 33 wrestlers on the 2026-27 roster are from North Carolina."])
  })

  it("quotes the wrestlers-only size, never the first pull's, which counted coaches and staff", () => {
    // NC State's page was read as 48 for a team of 32; Muse's rebuilt file has 32 (14 Oct 2026).
    const lines = rosterForSchool("north-carolina-state-university-nc-state").teamLines.join(" ")
    expect(lines).toBe("7 of the 32 wrestlers on the roster are from North Carolina.")
    expect(lines).not.toMatch(/48/)
  })

  it("never calls an unread roster empty", () => {
    const unread = Object.entries(
      (require("./nc-rosters-2026-27.json") as { schools: Record<string, { teams: Array<{ reviewed: boolean }> }> }).schools,
    ).find(([, s]) => s.teams.length === 1 && !s.teams[0].reviewed)!
    const view = rosterForSchool(unread[0])
    expect(view.anyReviewed).toBe(false)
    expect(view.teamLines[0]).toMatch(/^We could not read the roster/)
  })

  it("names the team when a school has two", () => {
    const lines = rosterForSchool("university-of-mount-olive").teamLines
    expect(lines).toHaveLength(2)
    expect(lines.join(" ")).toMatch(/men's roster/)
    expect(lines.join(" ")).toMatch(/women's roster/)
  })

  it("holds every wrestler in the workbook, plus UNC Pembroke's refresh", () => {
    const all = require("./nc-rosters-2026-27.json") as { schools: Record<string, { wrestlers: unknown[] }> }
    // 326 in the 12 Oct workbook; Pembroke refreshed from its live roster on 20 Oct: 21 became 27.
    expect(Object.values(all.schools).reduce((n, s) => n + s.wrestlers.length, 0)).toBe(332)
  })

  it("matches names across punctuation and case", () => {
    expect(rosterNameKey("Jovanny  Arellanes")).toBe(rosterNameKey("jovanny arellanes"))
    expect(rosterNameKey("Deyari El-Amin")).toBe("deyari elamin")
  })
})
