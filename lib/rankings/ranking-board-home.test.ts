import { describe, expect, it } from "vitest"

import { rankingBoardDefault, rankingBoardHome, rankingBoardStates } from "./ranking-board-home"

const brandon = {
  ranking_board_access: [
    { gender: "Female", years: "all", access: "edit" },
    { gender: "Male", years: "all", access: "read" },
  ],
  ranking_board_default: { gender: "Female", year: 2027 },
}

describe("rankingBoardHome", () => {
  it("sends a ranker to the board chosen for them", () => {
    expect(rankingBoardHome(brandon)).toBe("/admin/rankings/board?year=2027&gender=Female")
  })

  it("gives nobody a board without a grant", () => {
    expect(rankingBoardHome({})).toBeNull()
    expect(rankingBoardHome(null)).toBeNull()
    expect(rankingBoardHome({ ranking_board_default: { gender: "Female", year: 2027 } })).toBeNull()
  })

  it("falls back to the first board they may edit when none is chosen", () => {
    expect(
      rankingBoardDefault({
        ranking_board_access: [
          { gender: "Male", years: "all", access: "read" },
          { gender: "Female", years: [2028, 2027], access: "edit" },
        ],
      }),
    ).toEqual({ gender: "Female", year: 2027, state: "NC" })
  })

  it("ignores a chosen board the grants do not cover", () => {
    expect(
      rankingBoardDefault({
        ranking_board_access: [{ gender: "Female", years: [2028], access: "edit" }],
        ranking_board_default: { gender: "Male", year: 2027 },
      }),
    ).toEqual({ gender: "Female", year: 2028, state: "NC" })
  })
})

describe("a ranker for another state", () => {
  const dilberth = {
    ranking_board_access: [
      { access: "edit", gender: "Male", states: ["MD"], years: "all" },
      { access: "edit", gender: "Female", states: ["MD"], years: "all" },
    ],
  }
  it("opens on their own state and lists only it", () => {
    expect(rankingBoardDefault(dilberth)).toEqual({ gender: "Male", year: 2027, state: "MD" })
    expect(rankingBoardHome(dilberth)).toBe("/admin/rankings/board?year=2027&gender=Male&state=MD")
    expect(rankingBoardStates(dilberth)).toEqual(["MD"])
  })
  it("treats a grant with no states as North Carolina's, and an admin with no grant as every state", () => {
    expect(rankingBoardStates({ ranking_board_access: [{ access: "edit", gender: "Female", years: "all" }] })).toEqual(["NC"])
    expect(rankingBoardStates({})).toBeNull()
  })
})
