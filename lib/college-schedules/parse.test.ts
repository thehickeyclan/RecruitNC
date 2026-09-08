import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parseCollegeSchedule } from "./parse"
import { splitFixture } from "./sidearm-classic"

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
