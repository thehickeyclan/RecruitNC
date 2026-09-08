import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parseCollegeSchedule } from "./parse"
import { splitFixture } from "./sidearm-classic"
import { looksLikeTournament } from "./sidearm"
import { currentSeason, isInSeason, seasonBounds, seasonForDate } from "./season"

/**
 * Fixtures are real pages, trimmed to the parts the parsers read.
 *
 * The point of pinning them is that these sites are somebody else's and will be redesigned
 * without warning. A redesign should fail here, loudly, rather than quietly returning a season
 * with no results and leaving the calendar looking merely empty.
 */
const fixture = (name: string) => readFileSync(join(__dirname, "__fixtures__", `${name}.html`), "utf8")

describe("parseCollegeSchedule — Nuxt layout (NC State, Duke, UNC, Davidson)", () => {
  const parsed = parseCollegeSchedule(fixture("gopack"))

  it("recognises the layout", () => {
    expect(parsed.layout).toBe("nuxt")
  })

  it("reads a full season", () => {
    expect(parsed.events.length).toBeGreaterThan(15)
  })

  it("reads a dual with its score, venue and broadcaster", () => {
    const dual = parsed.events.find((e) => e.opponent === "Northern Colorado")
    expect(dual).toBeDefined()
    expect(dual!.date).toBe("2025-11-08")
    expect(dual!.outcome).toBe("W")
    expect(dual!.teamScore).toBe(30)
    expect(dual!.opponentScore).toBe(3)
    expect(dual!.homeAway).toBe("home")
    expect(dual!.tv).toBe("ACCNX")
  })

  it("leaves a meet that has not been wrestled without a score", () => {
    // Sidearm writes empty strings rather than nulls here, which must not read as nil-nil.
    const upcoming = parsed.events.filter((e) => !e.outcome)
    expect(upcoming.length).toBeGreaterThan(0)
    for (const event of upcoming) {
      expect(event.teamScore).toBeNull()
      expect(event.opponentScore).toBeNull()
    }
  })

  it("puts an open in the event name, never in the opponent", () => {
    const open = parsed.events.find((e) => e.eventName?.includes("Southeast Open"))
    expect(open).toBeDefined()
    expect(open!.opponent).toBeNull()
  })

  it("gives every event a real date, in order", () => {
    const dates = parsed.events.map((e) => e.date)
    for (const date of dates) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect([...dates].sort()).toEqual(dates)
  })
})

describe("parseCollegeSchedule — classic layout (App State, Campbell, Mount Olive, UNC Pembroke)", () => {
  const parsed = parseCollegeSchedule(fixture("umotrojans"))

  it("recognises the layout", () => {
    expect(parsed.layout).toBe("classic")
  })

  it("claims each score by date rather than by position", () => {
    // Mount Olive renders every meet three times, so position pairing put scores on the wrong
    // meets and the count guard threw all of them away.
    const king = parsed.events.find((e) => e.opponent === "King")
    expect(king).toBeDefined()
    expect(king!.date).toBe("2025-11-13")
    expect(king!.outcome).toBe("W")
    expect(king!.teamScore).toBe(40)
    expect(king!.opponentScore).toBe(8)
  })

  it("hands two meets on one day their own scores", () => {
    const sameDay = parsed.events.filter((e) => e.date === "2025-11-13")
    expect(sameDay.length).toBeGreaterThan(1)
    expect(new Set(sameDay.map((e) => `${e.teamScore}-${e.opponentScore}`)).size).toBe(sameDay.length)
  })
})

describe("splitFixture", () => {
  it("reads a name with no school in front of it", () => {
    // Mount Olive publishes " Vs King "; App State publishes the school name first. Requiring a
    // space before the At/Vs turned every Mount Olive dual into a nameless tournament.
    expect(splitFixture(" Vs King ")).toEqual({ homeAway: "home", opponent: "King", eventName: null })
    expect(splitFixture("Appalachian State University At Navy")).toEqual({
      homeAway: "away",
      opponent: "Navy",
      eventName: null,
    })
  })

  it("drops the host event from a neutral-site dual", () => {
    expect(splitFixture("App State Vs Navy (Journeymen's WrangleMania)").opponent).toBe("Navy")
  })

  it("treats an open as an event with nobody as home", () => {
    expect(splitFixture(" At East Stroudsburg Open")).toEqual({
      homeAway: "neutral",
      opponent: null,
      eventName: "East Stroudsburg Open",
    })
  })
})

describe("season filtering", () => {
  // The fixtures are 2025-26 pages, which is exactly the situation the filter exists for: in
  // September 2026 seven of the eight NC sites still served a season that had already finished.
  const nuxt = fixture("gopack")

  it("keeps a finished season out when a later one is asked for", () => {
    const parsed = parseCollegeSchedule(nuxt, "2026-27")
    expect(parsed.events).toHaveLength(0)
    // The distinction that matters: the page parsed fine, it just held the wrong season.
    expect(parsed.parsedCount).toBeGreaterThan(15)
    expect(parsed.layout).toBe("nuxt")
  })

  it("keeps the season it was asked for", () => {
    const parsed = parseCollegeSchedule(nuxt, "2025-26")
    expect(parsed.events.length).toBe(parsed.parsedCount)
    expect(parsed.events.every((e) => e.date >= "2025-08-01" && e.date <= "2026-07-31")).toBe(true)
  })

  it("takes whatever the page held when no season is named", () => {
    expect(parseCollegeSchedule(nuxt).events.length).toBeGreaterThan(15)
  })
})

describe("seasonForDate / currentSeason", () => {
  it("puts a November meet in the season that opened that August", () => {
    expect(seasonForDate("2026-11-21")).toBe("2026-27")
  })

  it("puts a March championship in the season that opened the previous August", () => {
    expect(seasonForDate("2027-03-19")).toBe("2026-27")
  })

  it("rolls to the new season in August, not in January", () => {
    expect(currentSeason(new Date("2026-07-31T12:00:00Z"))).toBe("2025-26")
    expect(currentSeason(new Date("2026-08-01T12:00:00Z"))).toBe("2026-27")
    expect(currentSeason(new Date("2027-01-15T12:00:00Z"))).toBe("2026-27")
  })

  it("spans August to July, wide enough for October opens and March championships", () => {
    expect(seasonBounds("2026-27")).toEqual({ season: "2026-27", start: "2026-08-01", end: "2027-07-31" })
    expect(isInSeason("2026-10-25", "2026-27")).toBe(true)
    expect(isInSeason("2026-03-19", "2026-27")).toBe(false)
  })
})

describe("looksLikeTournament", () => {
  it("catches the event names that were arriving as opponents", () => {
    // All three reached the live calendar as duals on the first real import.
    expect(looksLikeTournament("Navy vs. Gold")).toBe(true) // an intra-squad scrimmage, not Navy
    expect(looksLikeTournament("Missouri Valley Invite")).toBe(true) // "Invite", not "Invitational"
    expect(looksLikeTournament("Battle in the Bluegrass")).toBe(true)
  })

  it("still lets a real opponent through", () => {
    for (const school of ["Navy", "NC State", "Northern Iowa", "Lincoln Memorial", "Truett McConnell", "Keiser"]) {
      expect(looksLikeTournament(school)).toBe(false)
    }
  })
})
