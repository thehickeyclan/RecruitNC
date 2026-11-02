import { describe, expect, it } from "vitest"
import { classYearFromTitle, parseFloCommitmentList } from "@/lib/college-commitments/flo-parse"

/** The men's D1 shape: college first, state in its own column. */
const mens = `<h1>2027 NCAA Wrestling D1 Commitment List</h1>
<ul class="froala-ul"><li>Recent Commits</li></ul>
<table><tbody>
<tr><td>COLLEGE</td><td>NAME</td><td>BIG BOARD<br>RANK</td><td>HIGH SCHOOL</td><td>STATE</td><td>WEIGHT</td></tr>
<tr><td>Air Force</td><td>Salah Tsarni</td><td>18</td><td>Bullis School</td><td>MD</td><td>184</td></tr>
<tr><td>Cornell</td><td>Lucas Boe</td><td></td><td>Blair Academy</td><td>NJ</td><td>133</td></tr>
</tbody></table>`

/** The women's shape: college fifth, state inside the school cell, uncommitted rows included. */
const womens = `<h1>Ranked High School Senior Women's Commitment List</h1>
<table><tbody>
<tr><td>Name</td><td>Weight</td><td>Rank</td><td>High School</td><td>College</td><td>Division</td></tr>
<tr><td>Zoey Haney</td><td>95</td><td>#5</td><td>Troy Buchanan (MO)</td><td>Indiana Tech</td><td>NAIA</td></tr>
<tr><td>Alexa Rodriguez Lopez</td><td>95</td><td>#10</td><td>Dalla Hillcrest (TX)</td><td></td><td></td></tr>
</tbody></table>`

describe("parsing a Flo commitment list", () => {
  it("reads the men's shape by its header, not by column position", () => {
    const out = parseFloCommitmentList(mens, { articleId: "1", sourceUrl: "u", gender: "Male" })
    expect(out.classYear).toBe(2027)
    expect(out.rows.map((r) => [r.wrestlerName, r.college, r.state, r.bigBoardRank])).toEqual([
      ["Salah Tsarni", "Air Force", "MD", 18],
      ["Lucas Boe", "Cornell", "NJ", null],
    ])
  })

  it("reads the women's shape, where the college is the fifth column", () => {
    /* Counting columns would have read every woman's weight as her destination. */
    const out = parseFloCommitmentList(womens, { articleId: "2", sourceUrl: "u", gender: "Female", now: new Date("2026-10-25") })
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0]).toMatchObject({ wrestlerName: "Zoey Haney", college: "Indiana Tech", highSchool: "Troy Buchanan", state: "MO", divisionLabel: "NAIA" })
  })

  it("drops a ranked wrestler who has not committed, rather than inventing a destination", () => {
    const out = parseFloCommitmentList(womens, { articleId: "2", sourceUrl: "u", gender: "Female", now: new Date("2026-10-25") })
    expect(out.uncommittedRows).toBe(1)
  })

  it("takes the class year from the page, including a title that names only a school stage", () => {
    /* The URL slug is chosen once and the article is edited for years, so the page decides. */
    expect(classYearFromTitle("2026 NCAA Wrestling D1 Commitment List")).toBe(2026)
    expect(classYearFromTitle("Ranked High School Senior Women's Commitment List", new Date("2026-10-25"))).toBe(2027)
    expect(classYearFromTitle("Ranked High School Junior Women's Commitment List", new Date("2026-10-25"))).toBe(2028)
    expect(classYearFromTitle("A list with no class in it")).toBeNull()
  })

  it("refuses a page it cannot read rather than returning nothing", () => {
    expect(() => parseFloCommitmentList("<h1>2027 list</h1><p>no table</p>", { articleId: "1", sourceUrl: "u", gender: "Male" })).toThrow(/no table/)
    expect(() => parseFloCommitmentList(mens.replace("2027 ", ""), { articleId: "1", sourceUrl: "u", gender: "Male" })).toThrow(/no class year/)
  })
})
