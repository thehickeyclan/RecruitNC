import { describe, expect, it } from "vitest"
import { athleteStateCode, inState, normalizeStateCode } from "./states"

function recorder() {
  const calls: Array<[string, unknown]> = []
  const q = { eq: (c: string, v: unknown) => (calls.push([c, v]), q) }
  return { q, calls }
}

describe("inState", () => {
  it("keeps North Carolina on the NC flag, exactly as every list read it before", () => {
    const { q, calls } = recorder()
    inState(q)
    expect(calls).toEqual([["is_nc_athlete", true]])
    const again = recorder()
    inState(again.q, "nc")
    expect(again.calls).toEqual([["is_nc_athlete", true]])
  })

  it("reads any other state from the state column, and never counts an NC-flagged wrestler twice", () => {
    const { q, calls } = recorder()
    inState(q, "SC")
    expect(calls).toEqual([
      ["state", "SC"],
      ["is_nc_athlete", false],
    ])
  })

  it("falls back to North Carolina for a code that is not a state", () => {
    const { q, calls } = recorder()
    inState(q, "South Carolina")
    expect(calls).toEqual([["is_nc_athlete", true]])
  })
})

describe("athleteStateCode", () => {
  it("is NC for a flagged wrestler whatever the state column says", () => {
    expect(athleteStateCode({ is_nc_athlete: true, state: null })).toBe("NC")
    expect(athleteStateCode({ is_nc_athlete: true, state: "SC" })).toBe("NC")
  })
  it("reads the state column otherwise", () => {
    expect(athleteStateCode({ is_nc_athlete: false, state: " sc " })).toBe("SC")
    expect(athleteStateCode({ is_nc_athlete: false, state: null })).toBeNull()
    expect(normalizeStateCode("Virginia")).toBeNull()
  })
})
