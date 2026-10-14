import { describe, expect, it } from "vitest"

import { TOURNAMENT_LISTS, listsFor } from "./tournaments"

describe("the tournaments coaches want to see", () => {
  it("has men's folkstyle, men's freestyle and women's lists, each with events", () => {
    expect(TOURNAMENT_LISTS.map((l) => l.key)).toEqual(["mens-folkstyle", "mens-freestyle", "womens"])
    for (const list of TOURNAMENT_LISTS) expect(list.events.length, list.key).toBeGreaterThan(3)
  })

  it("includes every event Matt named for the men", () => {
    const men = TOURNAMENT_LISTS[0].events.map((e) => e.name).join(" | ")
    for (const name of ["Super 32", "NHSCA High School Nationals", "NHSCA National Duals", "Ironman", "Beast of the East", "AAU Scholastic Duals", "College open tournaments"]) expect(men).toContain(name)
    expect(TOURNAMENT_LISTS[1].events.map((e) => e.name)).toContain("US Open")
    expect(TOURNAMENT_LISTS[2].events.map((e) => e.name)).toContain("College open tournaments")
  })

  it("warns about the in-season events NC wrestlers have not been able to enter", () => {
    for (const e of TOURNAMENT_LISTS.flatMap((l) => l.events).filter((e) => /Ironman|Beast/.test(e.name))) expect(e.caution, e.name).toMatch(/inside the North Carolina high school season/)
  })

  it("leads a girl's family with the women's list", () => {
    expect(listsFor("womens")[0].key).toBe("womens")
    expect(listsFor("mens")[0].key).toBe("mens-folkstyle")
  })

  it("never says he or his", () => {
    const words = TOURNAMENT_LISTS.flatMap((l) => [l.intro, ...l.events.flatMap((e) => [e.why, e.who, e.caution ?? ""])]).join("\n")
    expect(words).not.toMatch(/\b(he|him|his)\b/i)
  })
})
