import { describe, expect, it } from "vitest"

import programs from "./programs-2026-27.json"
import { POLL_NAMES, classifyPoll, parsePollTables, pollGender, pollMatcher, rankingSentence, type PollSchool } from "./team-rankings"
import { pollStories } from "./team-rankings-build"

const schools = programs.schools as PollSchool[]
const row = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`
const table = (head: string[], rows: string[][]) => `<table>${row(head)}${rows.map(row).join("")}</table>`

const D1 = table(
  ["Rank", "Team (First)", "Record", "Points", "Conference", "Previous"],
  [
    ["1", "Penn State (16)", "(15-0)", "400", "Big Ten", "1"],
    ["2", "Ohio State", "(18-1)", "383", "Big Ten", "2"],
    ["3", "Oklahoma State", "(15-1)", "369", "Big 12", "3"],
    ["4", "Iowa State", "(12-2)", "351", "Big 12", "4"],
    ["5", "Nebraska", "(13-6)", "334", "Big Ten", "5"],
    ["6", "Not A Real College", "(1-9)", "10", "None", "NR"],
  ],
)

describe("team rankings from the coaches polls", () => {
  it("reads rank, team and record, and drops the first-place votes", () => {
    const [poll] = parsePollTables(D1)
    expect(poll.kind).toBe("poll")
    expect(poll.rows[0]).toEqual({ rank: 1, team: "Penn State", record: "15-0", points: 400, previous: "1" })
    expect(poll.rows).toHaveLength(6)
  })

  it("ignores the mid-major poll and tables that are not rankings", () => {
    const midMajor = D1.replace("Previous", "All-Sports")
    expect(parsePollTables(midMajor)).toEqual([])
    expect(parsePollTables(table(["Top-Ranked Individuals"], [["a"], ["b"], ["c"], ["d"], ["e"], ["f"]]))).toEqual([])
  })

  it("works out the level from the teams, and leaves an unknown team unplaced", () => {
    const [poll] = parsePollTables(D1)
    expect(classifyPoll(schools, poll, "mens")).toEqual({ scope: "NCAA Division I", matched: 5 })
    const match = pollMatcher(schools, "NCAA Division I", "mens")
    expect(match("Penn State")).toBe(schools.find((s) => s.name.startsWith("Pennsylvania State University"))!.id)
    expect(match("Not A Real College")).toBeNull()
  })

  it("will not classify a table it cannot mostly match", () => {
    const [poll] = parsePollTables(table(["Rank", "Team", "Points"], [["1", "Aaa", "9"], ["2", "Bbb", "8"], ["3", "Ccc", "7"], ["4", "Ddd", "6"], ["5", "Eee", "5"]]))
    expect(classifyPoll(schools, poll, "mens")).toBeNull()
  })

  it("matches a poll name only among the colleges at that level", () => {
    // York College of Pennsylvania is Division III; York University in Nebraska is NAIA.
    expect(pollMatcher(schools, "NCAA Division III", "mens")("York")).toBe("york-college-of-pennsylvania")
    expect(pollMatcher(schools, "NAIA", "mens")("York")).not.toBe("york-college-of-pennsylvania")
    expect(pollMatcher(schools, "NCAA Division III", "mens")("UW-La Crosse")).toBe("university-of-wisconsin-la-crosse")
  })

  it("points every poll spelling at a college that is on the map", () => {
    const ids = new Set(schools.map((s) => s.id))
    for (const [name, id] of Object.entries(POLL_NAMES)) expect(ids.has(id), name).toBe(true)
  })

  it("tells a women's poll from a men's, through soft hyphens", () => {
    expect(pollGender("NWCA Releases First NCAA Wom\u00aden's Coaches Poll")).toBe("womens")
    expect(pollGender("Minimal movement in first NWCA Division I Men's Wrestling Coaches Poll")).toBe("mens")
  })

  it("says the ranking with its poll and date", () => {
    expect(
      rankingSentence({ schoolId: "x", scope: "NCAA Division I", gender: "mens", rank: 8, of: 25, record: "12-4", pollName: "NWCA Division I coaches poll", pollDate: "2026-02-24", sourceUrl: "https://nwcaonline.com/x" }),
    ).toBe("No. 8 of 25 in the NWCA Division I coaches poll, February 24, 2026 (12-4)")
  })

  it("finds poll stories in the site map, newest first, from a date on", () => {
    const xml = ["2026/2/24/top-ranked-coaches-poll", "2025/3/1/old-poll", "2026/1/6/a-hire", "2026/3/6/final-coaches-poll"].map((p) => `<url><loc>https://nwcaonline.com/news/${p}.aspx</loc></url>`).join("")
    expect(pollStories(xml, "2025-10-01").map((s) => s.date)).toEqual(["2026-03-06", "2026-02-24"])
  })
})
