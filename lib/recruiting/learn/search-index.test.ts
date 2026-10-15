import { describe, expect, it } from "vitest"

import { buildSearchIndex, searchLearn } from "./search-index"

const index = buildSearchIndex()

describe("searching the Learn library", () => {
  it("covers the rules, the timeline and the tournaments", () => {
    expect(index.length).toBeGreaterThan(40)
    expect(index.some((e) => e.where === "Timeline")).toBe(true)
    expect(index.some((e) => e.where.startsWith("Tournaments"))).toBe(true)
  })

  it("finds what a family would type", () => {
    expect(searchLearn(index, "who pays visit")[0].title).toBe("Who pays for a recruiting visit?")
    expect(searchLearn(index, "NIL").length).toBeGreaterThan(2)
    expect(searchLearn(index, "fargo").some((e) => e.title.startsWith("Fargo"))).toBe(true)
  })

  it("finds nothing for nothing", () => {
    expect(searchLearn(index, "")).toEqual([])
    expect(searchLearn(index, "zzqx")).toEqual([])
  })
})
