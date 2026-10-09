import { describe, expect, it } from "vitest"
import { rankSimilar } from "./similar-wrestlers"

const c = (id: string, weight: string, rank: number | null, name = id) => ({
  id, name, highschool: null, weightclass: weight, prospect_ranking: rank, graduationyear: 2028,
})

describe("rankSimilar", () => {
  it("puts ranked wrestlers first, then the nearest weight, and leaves out the wrestler himself", () => {
    const out = rankSimilar({ id: "me", weight: 126 }, [c("me", "126", 3), c("far", "150", 1), c("near", "126", null), c("r9", "132", 9), c("r4", "120", 4)], 3)
    expect(out.map((x) => x.id)).toEqual(["r4", "r9", "near"])
  })

  it("does not call a wrestler past the published cut ranked", () => {
    const [x] = rankSimilar({ id: "me", weight: 126 }, [c("deep", "126", 45)], 1)
    expect(x!.rank).toBeNull()
  })
})
