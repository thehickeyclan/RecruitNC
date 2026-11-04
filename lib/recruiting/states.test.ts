import { describe, expect, it } from "vitest"
import { athleteStateCode, inState, inStates, normalizeStateCode } from "./states"

function recorder() {
  const calls: Array<[string, unknown]> = []
  const q = {
    eq: (c: string, v: unknown) => (calls.push([c, v]), q),
    or: (f: string) => (calls.push(["or", f]), q),
  }
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

describe("inStates", () => {
  it("is inState for one state, or none", () => {
    const { q, calls } = recorder()
    inStates(q, ["NC"])
    expect(calls).toEqual([["is_nc_athlete", true]])
    const none = recorder()
    inStates(none.q, [])
    expect(none.calls).toEqual([["is_nc_athlete", true]])
    const sc = recorder()
    inStates(sc.q, ["sc", "SC"])
    expect(sc.calls).toEqual([
      ["state", "SC"],
      ["is_nc_athlete", false],
    ])
  })

  it("keeps North Carolina on its flag and every other state on its code, in one filter", () => {
    const { q, calls } = recorder()
    inStates(q, ["NC", "SC", "VA"])
    expect(calls).toEqual([["or", "is_nc_athlete.eq.true,and(state.in.(SC,VA),is_nc_athlete.eq.false)"]])
  })

  it("leaves North Carolina out when it is not asked for", () => {
    const { q, calls } = recorder()
    inStates(q, ["SC", "VA"])
    expect(calls).toEqual([["or", "and(state.in.(SC,VA),is_nc_athlete.eq.false)"]])
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

describe("inStates with another condition", () => {
  it("admits rows the extra condition matches, alongside the states", () => {
    let filter = ""
    inStates({ or: (f: string) => ((filter = f), null) }, ["NC", "SC"], ["and(is_nc_athlete.eq.false,claimed_at.not.is.null)"])
    expect(filter).toBe("is_nc_athlete.eq.true,and(state.in.(SC),is_nc_athlete.eq.false),and(is_nc_athlete.eq.false,claimed_at.not.is.null)")
  })
})
