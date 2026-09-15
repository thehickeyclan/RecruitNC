import { describe, expect, it } from "vitest"
import {
  madeWeight,
  parseScaleReading,
  summarizeWeighIns,
  weighInState,
  WEIGH_IN_STATIONS,
  type RosterAthlete,
  type WeighInRecord,
} from "./weigh-in"

const record = (over: Partial<WeighInRecord> = {}): WeighInRecord => ({
  athleteId: "a",
  weightClass: 133,
  recordedWeight: 132.6,
  skinCheck: "pass",
  lanyardGiven: true,
  notes: null,
  recordedByName: null,
  updatedAt: null,
  ...over,
})

describe("madeWeight", () => {
  it("is flat: at or under the class makes it, a tenth over does not", () => {
    expect(madeWeight(133, 133)).toBe(true)
    expect(madeWeight(133.1, 133)).toBe(false)
    expect(madeWeight(null, 133)).toBeNull()
  })
})

describe("weighInState", () => {
  it("treats no record as not weighed", () => {
    expect(weighInState(undefined)).toBe("not-weighed")
  })

  it("clears with weight on or under the class and a passed skin check; the lanyard is not required", () => {
    expect(weighInState(record())).toBe("cleared")
    expect(weighInState(record({ lanyardGiven: false }))).toBe("cleared")
    expect(weighInState(record({ skinCheck: null }))).toBe("incomplete")
    expect(weighInState(record({ recordedWeight: null }))).toBe("incomplete")
  })

  it("flags over weight ahead of anything else", () => {
    expect(weighInState(record({ recordedWeight: 134 }))).toBe("over-weight")
  })

  it("flags a failed skin check", () => {
    expect(weighInState(record({ skinCheck: "fail" }))).toBe("skin-fail")
  })
})

describe("summarizeWeighIns", () => {
  it("counts every state and lists who is still missing by weight", () => {
    const roster: RosterAthlete[] = [
      { athleteId: "a", name: "A", club: null, weightClass: 133, seed: 1 },
      { athleteId: "b", name: "B", club: null, weightClass: 133, seed: 2 },
      { athleteId: "c", name: "C", club: null, weightClass: 285, seed: 1 },
      { athleteId: "d", name: "D", club: null, weightClass: 285, seed: 2 },
    ]
    const records = new Map([
      ["a", record({ athleteId: "a" })],
      ["c", record({ athleteId: "c", weightClass: 285, recordedWeight: 290 })],
    ])
    const s = summarizeWeighIns(roster, records)
    expect(s).toMatchObject({ total: 4, cleared: 1, notWeighed: 2, problems: 1, incomplete: 0 })
    expect(s.missingByWeight[133].map((x) => x.name)).toEqual(["B"])
    expect(s.missingByWeight[285].map((x) => x.name)).toEqual(["D"])
  })
})

describe("parseScaleReading", () => {
  it("reads what a scale person types", () => {
    expect(parseScaleReading("133")).toBe(133)
    expect(parseScaleReading(" 132.8 lbs")).toBe(132.8)
    expect(parseScaleReading("abc")).toBeNull()
    expect(parseScaleReading("13")).toBeNull()
  })
})

describe("WEIGH_IN_STATIONS", () => {
  it("splits all ten weights between two stations with no overlap", () => {
    const all = WEIGH_IN_STATIONS.flatMap((s) => s.weights)
    expect(all).toHaveLength(10)
    expect(new Set(all).size).toBe(10)
  })
})
