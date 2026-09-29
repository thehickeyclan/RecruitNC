import { describe, expect, it } from "vitest"
import { highSchoolBracketRows, parseSuper32Csv, type Super32Row } from "@/lib/super32-bout-import"

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
