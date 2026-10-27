import { describe, expect, it } from "vitest"
import {
  SUPER32_GIRLS_WEIGHTS,
  feminineNameShare,
  girlsBracketRows,
  highSchoolBracketRows,
  parseSuper32Csv,
  type Super32Row,
} from "@/lib/super32-bout-import"

const bout = (weight: string, winner: string, loser: string, over: Partial<Super32Row> = {}): Super32Row => ({
  date: "10/18/2025",
  weight,
  round: "Round of 64",
  winner,
  winnerTeam: "NC",
  result: "DEC 3-1",
  winType: "DEC",
  loser,
  loserTeam: "PA",
  ...over,
})

describe("parseSuper32Csv", () => {
  it("reads the =\"value\" cells Trackwrestling exports", () => {
    const text =
      '"=""Date""","=""Weight""","=""Round""","=""Winning Wrestler""","=""Winning Team""","=""Result""","=""Win Type""","=""Losing Wrestler""","=""Losing Team""","=""City""","=""State""","=""Event"""\n' +
      '"=""10/18/2025""","=""157""","=""Round of 16""","=""Liam Kelly""","=""IL""","=""2-1""","=""DEC""","=""Lorenzo Alston""","=""NC""","=""Greensboro""","=""NC""","=""2025 Defense Soap Super 32"""\n'
    expect(parseSuper32Csv(text)).toEqual([
      {
        date: "10/18/2025", weight: "157", round: "Round of 16", winner: "Liam Kelly", winnerTeam: "IL",
        result: "2-1", winType: "DEC", loser: "Lorenzo Alston", loserTeam: "NC",
      },
    ])
  })
})

describe("highSchoolBracketRows", () => {
  it("drops every youth and girls' weight label", () => {
    const rows = [bout("85", "A", "B"), bout("148", "C", "D"), bout("HWT (Max 235)", "E", "F")]
    expect(highSchoolBracketRows(rows)).toEqual([])
  })

  it("keeps the larger of two brackets sharing a high school weight", () => {
    // 2025 ran a 173-man and a 48-man bracket both labelled 132.
    const boys = [bout("132", "A", "B"), bout("132", "A", "C"), bout("132", "D", "A", { loserTeam: "NC" })]
    const other = [bout("132", "X", "Y"), bout("132", "Z", "X", { round: "Consi of 4" })]
    const kept = highSchoolBracketRows([...other, ...boys])
    expect(kept).toEqual(boys)
  })

  it("keeps a bye in the boys' bracket, for the caller to skip", () => {
    const rows = [bout("106", "A", "B"), bout("106", "A", "", { winType: "BYE", loserTeam: "" }), bout("106", "X", "Y")]
    expect(highSchoolBracketRows(rows)).toHaveLength(2)
  })

  it("does not join two brackets through a shared name from another state", () => {
    // Same name, different state: different wrestlers, so the brackets stay apart.
    const boys = [bout("138", "Sam Lee", "B"), bout("138", "C", "Sam Lee", { loserTeam: "NC" }), bout("138", "C", "D")]
    const other = [bout("138", "Sam Lee", "E", { winnerTeam: "GA" })]
    expect(highSchoolBracketRows([...boys, ...other])).toEqual(boys)
  })
})

describe("the girls' high school bracket", () => {
  /**
   * Two brackets at one weight, the way the 2025 file holds them: a youth boys' bracket and the
   * girls', with no division column and no overlap in wrestlers.
   */
  const row = (weight: string, winner: string, loser: string): Super32Row => ({
    date: "10/18/2025", weight, round: "Round of 16", winner, winnerTeam: "NC",
    result: "", winType: "DEC", loser, loserTeam: "PA",
  })
  const rows: Super32Row[] = [
    /* One girls' bracket: the bouts chain, which is what makes them one bracket. */
    row("100", "Jaclyn Bouzakis", "Bella Manno"),
    row("100", "Jaclyn Bouzakis", "Breanna Higgins"),
    row("100", "Sophia Toscano", "Breanna Higgins"),
    row("100", "Sophia Toscano", "Cassidy OConnell"),
    row("100", "Brianna Biggs", "Cassidy OConnell"),
    /* A youth boys' bracket at the same weight, sharing nobody with it. */
    row("100", "Abram Whitaker", "Brady Watson"),
    row("100", "Abram Whitaker", "Brixton Archuleta"),
    row("100", "Camron Veneziano", "Brixton Archuleta"),
    row("100", "Camron Veneziano", "Easton Hare"),
    row("100", "Colton Reed", "Easton Hare"),
    // weight 85, youth only — not a girls' weight, so nothing is taken from it
    row("85", "Avery Lipscomb", "Benjamin Ellison"),
  ]

  it("takes the girls' bracket and leaves the youth bracket at the same weight", () => {
    const girls = girlsBracketRows(rows)
    const names = new Set(girls.flatMap((r) => [r.winner, r.loser]))
    expect(names.has("Jaclyn Bouzakis")).toBe(true)
    expect(names.has("Bella Manno")).toBe(true)
    expect(names.has("Abram Whitaker")).toBe(false)
    expect(names.has("Brixton Archuleta")).toBe(false)
  })

  it("takes nothing from a weight that is not one of the eleven", () => {
    /* Names alone would have claimed a thirteen-man bracket at 175 on the real 2025 file. */
    expect(girlsBracketRows(rows).some((r) => r.weight === "85")).toBe(false)
  })

  it("never overlaps the boys' high school bracket", () => {
    const girls = new Set(girlsBracketRows(rows).map((r) => r.weight))
    for (const w of girls) expect(SUPER32_GIRLS_WEIGHTS.has(w)).toBe(true)
  })

  it("scores a bracket of girls' names far above a bracket of boys' names", () => {
    /* The gap on the real file is forty points wide, which is why the threshold is safe. */
    expect(feminineNameShare(["Jaclyn Bouzakis", "Bella Manno", "Breanna Higgins", "Cassidy OConnell"])).toBeGreaterThan(0.5)
    expect(feminineNameShare(["Abram Whitaker", "Brady Watson", "Brixton Archuleta", "Camron Veneziano"])).toBeLessThan(0.35)
  })
})
