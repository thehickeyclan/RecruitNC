import { describe, expect, it } from "vitest"
import {
  HOME_STATE,
  US_STATES,
  inState,
  isHomeState,
  normalizeState,
  invitationalName,
  stateChampionshipName,
  stateName,
} from "@/lib/athlete-state"

describe("normalizeState", () => {
  it("upper-cases a two-letter code", () => {
    expect(normalizeState("sc")).toBe("SC")
    expect(normalizeState(" nc ")).toBe("NC")
  })

  it("falls back to the home state rather than filtering on nonsense", () => {
    /* A board asked for an empty or malformed state shows North Carolina, never every state. */
    expect(normalizeState("")).toBe(HOME_STATE)
    expect(normalizeState(null)).toBe(HOME_STATE)
    expect(normalizeState("North Carolina")).toBe(HOME_STATE)
  })
})

describe("inState", () => {
  it("filters the athletes query on the state column", () => {
    const calls: Array<[string, string]> = []
    const q = { eq: (c: string, v: string) => { calls.push([c, v]); return q } }
    inState(q, "sc")
    expect(calls).toEqual([["state", "SC"]])
  })

  it("defaults to the home state, so a caller that names none is unchanged", () => {
    const calls: Array<[string, string]> = []
    const q = { eq: (c: string, v: string) => { calls.push([c, v]); return q } }
    inState(q)
    expect(calls).toEqual([["state", "NC"]])
  })
})

describe("the state list", () => {
  it("covers the whole country, because a family signs up before their state has data", () => {
    expect(US_STATES).toHaveLength(51)
    expect(US_STATES.map((s) => s.code)).toContain("SC")
    expect(new Set(US_STATES.map((s) => s.code)).size).toBe(US_STATES.length)
  })

  it("names a code, and leaves an unknown one legible rather than blank", () => {
    expect(stateName("sc")).toBe("South Carolina")
    expect(stateName("NC")).toBe("North Carolina")
    expect(stateName("ZZ")).toBe("ZZ")
    expect(stateName(null)).toBe("")
  })

  it("knows the home state from any casing", () => {
    expect(isHomeState("nc")).toBe(true)
    expect(isHomeState(" NC ")).toBe(true)
    expect(isHomeState("SC")).toBe(false)
    expect(isHomeState(null)).toBe(false)
  })
})

describe("stateChampionshipName", () => {
  it("names each state's public championship body", () => {
    expect(stateChampionshipName("NC", "4A")).toBe("NCHSAA")
    expect(stateChampionshipName("SC", "4A")).toBe("SCHSL")
  })

  it("names the independent-schools championship when that is where he placed", () => {
    expect(stateChampionshipName("NC", "NCISA")).toBe("NCISA")
    expect(stateChampionshipName("SC", "SCISA 3A")).toBe("SCISA")
  })

  it("takes the body from the row's own association where the classification does not print it", () => {
    /*
     * Pennsylvania's independent-schools rows are classified "Open", so there is nothing in the
     * classification to read PAISWT out of - and calling one of those placers a PIAA champion
     * credits him with a title his school cannot win.
     */
    expect(stateChampionshipName("PA", "Open", "PAISWT")).toBe("PAISWT")
    expect(stateChampionshipName("PA", "AAA", "PIAA")).toBe("PIAA")
    expect(stateChampionshipName("PA", "Open")).toBe("PIAA")
  })

  it("ignores an association that is not one this state crowns a separate champion for", () => {
    expect(stateChampionshipName("NC", "4A", "NCHSAA")).toBe("NCHSAA")
    expect(stateChampionshipName("NC", "4A", "Some Made Up Body")).toBe("NCHSAA")
  })

  it("names the state itself where we hold no association, rather than inventing one", () => {
    /*
     * "Wyoming State Champion" is unambiguous; a made-up acronym would not be.
     *
     * This assertion has already moved twice - Texas, then Oklahoma - because the example state
     * keeps getting registered as the import chain reaches it, and each move was a red test on a
     * branch that had changed nothing about this rule. So it no longer names one: it finds a state
     * we genuinely hold no association for and asserts the rule there. It fails only when every
     * candidate has been registered, which is a real signal to pick new ones rather than a stale
     * fixture.
     */
    const candidates = ["WY", "ND", "SD", "MT", "AK", "HI", "NV", "NM"]
    const held = candidates.find((c) => stateChampionshipName(c, "6A") === stateName(c))
    expect(held, `all of ${candidates.join(", ")} now carry an association - choose new candidates`).toBeDefined()
    expect(stateChampionshipName(held!, "6A")).toBe(stateName(held!))
    /* The point of the rule: a full state name, never an invented acronym. */
    expect(stateChampionshipName(held!, "6A")).not.toMatch(/^[A-Z]{3,}$/)
  })

  it("still prefers a registered association, and the row's own one above it", () => {
    expect(stateChampionshipName("TX", "6A")).toBe("UIL")
    expect(stateChampionshipName("TX", "Open", "SPC")).toBe("SPC")
    expect(stateChampionshipName("TX", "Open", "TX Prep State")).toBe("TX Prep State")
    expect(stateChampionshipName("OK", "6A")).toBe("OSSAA")
    expect(stateChampionshipName("AR", "1A-4A")).toBe("AAA")
  })

  it("both states have a 4A, which is why the state must appear at all", () => {
    expect(stateChampionshipName("NC", "4A")).not.toBe(stateChampionshipName("SC", "4A"))
  })
})

describe("states with more than one association, and events that are not championships", () => {
  it("names Maryland's three apart", () => {
    expect(stateChampionshipName("MD", "2A/1A")).toBe("MPSSAA")
    expect(stateChampionshipName("MD", "MIS")).toBe("MIS")
    expect(stateChampionshipName("MD", "MIAA")).toBe("MIAA")
  })

  it("names Georgia's private association GIAA, which it renamed to in 2022", () => {
    /* GISA is the old name; every event we hold ran under GIAA, so using GISA mislabels them. */
    expect(stateChampionshipName("GA", "6A")).toBe("GHSA")
    expect(stateChampionshipName("GA", "GIAA")).toBe("GIAA")
    expect(stateChampionshipName("GA", "GISA")).toBe("GHSA")
  })

  it("names Tennessee's", () => {
    expect(stateChampionshipName("TN", "A-AA")).toBe("TSSAA")
  })

  it("names Delaware's", () => {
    expect(stateChampionshipName("DE", "DIAA")).toBe("DIAA")
    expect(stateChampionshipName("DE", "")).toBe("DIAA")
  })

  it("names West Virginia's, which has no separate private championship", () => {
    expect(stateChampionshipName("WV", "AAA")).toBe("WVSSAC")
    expect(stateChampionshipName("WV", "Division 1")).toBe("WVSSAC")
  })

  it("will not call West Virginia's girls invitational a championship", () => {
    /*
     * The WVSSAC does not sanction girls' wrestling until 2026-27. Crediting a 2026 winner with
     * a WVSSAC state title would award her something her state did not.
     */
    expect(invitationalName("WV", "Girls Invitational")).toBe("WV Girls State Invitational")
    expect(invitationalName("WV", "AAA")).toBeNull()
    expect(invitationalName("NC", "Girls Invitational")).toBeNull()
  })
})
