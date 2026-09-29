import { describe, expect, it } from "vitest"
import { eduDomainLabel, searchColleges, suggestColleges } from "./college-match"

const colleges = [
  { id: "1", name: "Averett" },
  { id: "2", name: "Appalachian State" },
  { id: "3", name: "Campbell" },
  { id: "4", name: "NC State" },
  { id: "5", name: "Washington & Jefferson" },
  { id: "6", name: "Baldwin & Wallace" },
  { id: "7", name: "Rochester College" },
  { id: "8", name: "UNC Chapel Hill" },
  { id: "9", name: "UNC Pembroke" },
]

const names = (list: Array<{ name: string }>) => list.map((c) => c.name)

describe("suggestColleges", () => {
  it("finds the short name inside the formal one they typed", () => {
    expect(names(suggestColleges(colleges, { institution: "Averett University" }))[0]).toBe("Averett")
  })

  it("reads & and 'and' as the same word", () => {
    expect(names(suggestColleges(colleges, { institution: "Washington and Jefferson College" }))[0]).toBe(
      "Washington & Jefferson",
    )
  })

  it("uses the email domain when the typed name does not help", () => {
    expect(names(suggestColleges(colleges, { institution: "", email: "coach@campbell.edu" }))).toEqual(["Campbell"])
  })

  it("suggests nothing rather than something wrong", () => {
    expect(suggestColleges(colleges, { institution: "Wabash College", email: "coach@wabash.edu" })).toEqual([])
    expect(suggestColleges(colleges, { institution: "", email: "coach@gmail.com" })).toEqual([])
  })

  it("needs the shared words to be most of what they typed", () => {
    // Both were real suggestions against production data before this rule.
    expect(names(suggestColleges(colleges, { institution: "NC Wrestling United", email: "x@example.com" }))).toEqual([])
    expect(names(suggestColleges(colleges, { institution: "Rochester Institute of Technology", email: "x@rit.edu" }))).toEqual([])
  })

  it("reads North Carolina as NC", () => {
    expect(names(suggestColleges(colleges, { institution: "North Carolina State University", email: "x@ncsu.edu" }))[0]).toBe("NC State")
  })

  it("ranks the campus they named above its sibling", () => {
    const got = names(suggestColleges(colleges, { institution: "University of North Carolina at Chapel Hill", email: "x@unc.edu" }))
    expect(got[0]).toBe("UNC Chapel Hill")
  })

  it("ignores a bracketed abbreviation", () => {
    const list = [{ id: "r", name: "Rochester Institute of Technology (RIT)" }]
    expect(names(suggestColleges(list, { institution: "Rochester Institute of Technology", email: "x@rit.edu" }))).toEqual([
      "Rochester Institute of Technology (RIT)",
    ])
  })

  it("does not match on generic words alone", () => {
    // "State" appears in both, but it is not what makes either of them a school.
    expect(names(suggestColleges(colleges, { institution: "Penn State" }))).not.toContain("NC State")
  })
})

describe("eduDomainLabel", () => {
  it("takes the label nearest .edu", () => {
    expect(eduDomainLabel("a@washjeff.edu")).toBe("washjeff")
    expect(eduDomainLabel("a@mail.ncsu.edu")).toBe("ncsu")
    expect(eduDomainLabel("a@gmail.com")).toBeNull()
  })
})

describe("searchColleges", () => {
  it("matches every word, in any order", () => {
    expect(names(searchColleges(colleges, "jefferson wash"))).toEqual(["Washington & Jefferson"])
    expect(searchColleges(colleges, "")).toHaveLength(colleges.length)
  })
})
