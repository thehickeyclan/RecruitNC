import { describe, expect, it } from "vitest"
import { matchColleges } from "./college-picker-match"

const colleges = [
  { id: "1", name: "The University of Virginia" },
  { id: "2", name: "Virginia Tech" },
  { id: "3", name: "West Virginia University" },
  { id: "4", name: "NC State" },
  { id: "5", name: "Washington & Lee" },
  { id: "6", name: "Washington and Jefferson College" },
  { id: "7", name: "Appalachian State" },
]
const names = (typed: string) => matchColleges(colleges, typed).map((c) => c.name)

describe("matchColleges", () => {
  it("finds a school from a partial word", () => {
    expect(names("virg")).toEqual(["Virginia Tech", "The University of Virginia", "West Virginia University"])
    expect(names("app st")).toEqual(["Appalachian State"])
  })

  it("ignores the words every school shares", () => {
    expect(names("University of Virginia")).toEqual(["Virginia Tech", "The University of Virginia", "West Virginia University"])
    expect(names("university")).toEqual([])
  })

  it("needs every typed word to match", () => {
    expect(names("washington lee")).toEqual(["Washington & Lee"])
    expect(names("virginia tech")).toEqual(["Virginia Tech"])
    expect(names("zzz")).toEqual([])
  })
})
