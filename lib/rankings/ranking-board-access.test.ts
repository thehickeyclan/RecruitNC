import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))

import { hasAnyRankingBoardGrant, rankingBoardAccessFor } from "./ranking-board-access"

/** Brandon Palmer's grant (Matt, 8 October 2026). */
const BRANDON = [
  { gender: "Female", years: [2027, 2028], access: "edit" },
  { gender: "Male", years: "all", access: "read" },
]

describe("ranking board access", () => {
  it("edits the women's 2027 and 2028 boards", () => {
    expect(rankingBoardAccessFor(BRANDON, "Female", 2027)).toBe("edit")
    expect(rankingBoardAccessFor(BRANDON, "Female", 2028)).toBe("edit")
  })

  it("has nothing on the other women's classes", () => {
    expect(rankingBoardAccessFor(BRANDON, "Female", 2029)).toBeNull()
    expect(rankingBoardAccessFor(BRANDON, "Female", 2026)).toBeNull()
  })

  it("reads every men's board and edits none", () => {
    for (const year of [2026, 2027, 2028, 2029, 2030]) expect(rankingBoardAccessFor(BRANDON, "Male", year)).toBe("read")
  })

  it("matches gender without caring about case", () => {
    expect(rankingBoardAccessFor(BRANDON, "female", 2027)).toBe("edit")
  })

  it("gives nothing to an account with no grant or a malformed one", () => {
    expect(rankingBoardAccessFor(undefined, "Male", 2027)).toBeNull()
    expect(rankingBoardAccessFor([{ gender: "Male", years: "all", access: "admin" }], "Male", 2027)).toBeNull()
    expect(hasAnyRankingBoardGrant({ gender: "Male" })).toBe(false)
    expect(hasAnyRankingBoardGrant(BRANDON)).toBe(true)
  })

  it("keeps a grant without states on North Carolina", () => {
    expect(rankingBoardAccessFor(BRANDON, "Female", 2027, "SC")).toBeNull()
    expect(rankingBoardAccessFor(BRANDON, "Female", 2027, "NC")).toBe("edit")
  })

  it("scopes a South Carolina ranker to South Carolina (Alan Faponte, 21 Oct 2026)", () => {
    const ALAN = [
      { gender: "Male", years: "all", access: "edit", states: ["SC"] },
      { gender: "Female", years: "all", access: "edit", states: ["SC"] },
    ]
    expect(rankingBoardAccessFor(ALAN, "Male", 2027, "SC")).toBe("edit")
    expect(rankingBoardAccessFor(ALAN, "Female", 2028, "sc")).toBe("edit")
    expect(rankingBoardAccessFor(ALAN, "Male", 2027, "NC")).toBeNull()
    expect(rankingBoardAccessFor(ALAN, "Male", 2027)).toBeNull()
    expect(hasAnyRankingBoardGrant(ALAN, "NC")).toBe(false)
    expect(hasAnyRankingBoardGrant(ALAN, "SC")).toBe(true)
  })
})
