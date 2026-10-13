import { describe, expect, it } from "vitest"

import { asHeadline, gpaStats, groupSentence, parseGpa, stateTier, summariseGroup } from "./went-here-stats"

const creds = (state: Array<number | null>, national: Array<number | null> = []) => ({
  allAmerican: [],
  toc: [],
  state: state.map((place, i) => ({ year: 2026 - i, place, classification: "4A" })),
  national: national.map((place) => ({ year: 2026, event: "NHSCA" as const, place, placementText: null, record: null })),
})

describe("GPA", () => {
  it("reads what families type and refuses nonsense", () => {
    expect(parseGpa("3.8")).toBe(3.8)
    expect(parseGpa("4.2 weighted")).toBe(4.2)
    expect(parseGpa(3.75)).toBe(3.75)
    expect(parseGpa("N/A")).toBeNull()
    expect(parseGpa("95")).toBeNull()
    expect(parseGpa(null)).toBeNull()
  })

  it("gives an average with its low and high", () => {
    expect(gpaStats([3.4, 4.6, 4.0, 4.2, 3.8])).toEqual({ count: 5, average: 4, low: 3.4, high: 4.6 })
  })

  it("says nothing for a group small enough to point at a child", () => {
    expect(gpaStats([3.4, 4.6, 4.0, 4.2])).toBeNull()
    expect(gpaStats([3.4, null, 4.6, null, 4.0, 4.2, null])).toBeNull()
  })
})

describe("what a group had done", () => {
  it("ranks a wrestler by his best state finish", () => {
    expect(stateTier(creds([3, 1]))).toBe("state-champion")
    expect(stateTier(creds([null, 4]))).toBe("state-placer")
    expect(stateTier(creds([null]))).toBe("state-qualifier")
    expect(stateTier(creds([]))).toBe("none")
  })

  it("counts and says it in one sentence", () => {
    const summary = summariseGroup([creds([1], [4]), creds([1]), creds([3]), creds([null]), creds([])])
    expect(summary).toEqual({ wrestlers: 5, stateChampions: 2, statePlacers: 1, stateQualifiers: 1, nationalPlacers: 1 })
    expect(groupSentence(summary)).toBe("2 of 5 were NCHSAA state champions, 1 more placed at state and 1 placed at a national tournament.")
  })

  it("is plain when nobody placed, and silent for an empty group", () => {
    expect(groupSentence(summariseGroup([creds([null]), creds([])]))).toBe("None of the 2 placed at the NCHSAA state tournament on our records.")
    expect(groupSentence(summariseGroup([]))).toBeNull()
  })

  it("turns an email clause into a line about someone else", () => {
    expect(asHeadline("placed 3rd at the 2026 NCHSAA 4A state tournament")).toBe("Placed 3rd at the 2026 NCHSAA 4A state tournament")
  })
})
