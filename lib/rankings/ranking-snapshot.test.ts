import { describe, expect, it } from "vitest"
import { diffAgainstPrior } from "./ranking-snapshot"

describe("a published edition measured against the one it replaces", () => {
  it("marks nobody new and nobody moved on a first edition", () => {
    const rows = diffAgainstPrior(
      [
        { athlete_id: "b", rank: 2 },
        { athlete_id: "a", rank: 1 },
      ],
      null,
    )
    expect(rows).toEqual([
      { athlete_id: "a", rank: 1, previous_rank: null, is_new: false },
      { athlete_id: "b", rank: 2, previous_rank: null, is_new: false },
    ])
  })

  it("carries each wrestler's old rank and tags the ones who were not on it", () => {
    const prior = new Map([
      ["a", 2],
      ["b", 1],
      ["gone", 3],
    ])
    expect(
      diffAgainstPrior(
        [
          { athlete_id: "a", rank: 1 },
          { athlete_id: "b", rank: 2 },
          { athlete_id: "c", rank: 3 },
        ],
        prior,
      ),
    ).toEqual([
      { athlete_id: "a", rank: 1, previous_rank: 2, is_new: false },
      { athlete_id: "b", rank: 2, previous_rank: 1, is_new: false },
      { athlete_id: "c", rank: 3, previous_rank: null, is_new: true },
    ])
  })

  it("treats an empty earlier edition as no edition", () => {
    expect(diffAgainstPrior([{ athlete_id: "a", rank: 1 }], new Map())[0]!.is_new).toBe(false)
  })
})
