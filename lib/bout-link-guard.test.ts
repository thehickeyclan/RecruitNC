import { describe, expect, it } from "vitest"

import { aliasKey, boutsToUnlink, NOT_HIS_EVENTS, type AliasVerdict, type GuardBout } from "./bout-link-guard"

const carson = { id: "carson", name: "Carson Owens", gender: "Male", state: "NC", highschool: "Leesville Road" }
const isaac = { id: "isaac", name: "Isaac Young", gender: "Male", state: "NC", highschool: "Pisgah" }
const athletes = new Map([
  [carson.id, carson],
  [isaac.id, isaac],
])
const identities = new Map([
  ["carson", "id-carson"],
  ["isaac", "id-isaac"],
])

let n = 0
const bout = (athlete_id: string, athlete_name: string, athlete_club: string, weight_class: string, event_date: string, event_key = "e"): GuardBout => ({
  id: String(++n),
  athlete_id,
  athlete_name,
  athlete_club,
  weight_class,
  event_date,
  event_key,
  gender: "M",
})

// Carson Owens's profile as it stood on 29 October 2026 (the third time a Missouri namesake landed on it).
const CARSON = [
  bout("carson", "Carson Owens", "NC", "190", "2026-10-25", "super32-2026"),
  bout("carson", "Carson Owens", "NC", "175", "2025-10-25", "super32-2025"),
  bout("carson", "Carson Owens", "NC", "170", "2025-03-20", "nhsca-nationals-2025"),
  bout("carson", "Carson Owens", "RAW", "197", "2026-09-18", "toc-2026"),
  bout("carson", "Carson Owens", "RALEIGH AREA WOLFPACK", "215", "2026-10-10", "i64-fall-duals-2026"),
  bout("carson", "Carson Owens", "MO", "132", "2026-07-15", "fargo-2026-junior-gr"),
  bout("carson", "Carson Owens", "MO", "126", "2026-03-26", "nhsca-nationals-2026"),
  bout("carson", "Carson Owens", "Team Shutt", "140", "2026-10-03", "journeymen-fall-classic-2026"),
  bout("carson", "Carson Owens", "GT 4238 - HSB", "132", "2026-05-23", "nhsca-national-duals-2026"),
]
// Isaac Young: a Forge Wrestling namesake at nearly his weight - only his family's word separates them.
const ISAAC = [
  bout("isaac", "Isaac Young", "NC", "152", "2026-03-26", "nhsca-nationals-2026"),
  bout("isaac", "Isaac Young", "Pisgah High School", "157", "2026-02-21", "nchsaa-states-2026"),
  bout("isaac", "Isaac Young", "FOWR", "157", "2026-04-18", "tarheel-classic-2026"),
  bout("isaac", "Isaac Young", "Forge wrestling", "144", "2026-09-05", "super32-early-entry-nc-2026"),
  bout("isaac", "Isaac Young", "MF Dynasty Black - HSB", "182", "2026-05-23", "nhsca-national-duals-2026"),
]

const ALIASES = new Map<string, AliasVerdict>([
  [aliasKey("Carson Owens", "NC"), { status: "linked", identityId: "id-carson" }],
  [aliasKey("Carson Owens", "RAW"), { status: "review" }],
  [aliasKey("Carson Owens", "Team Shutt"), { status: "review" }],
  [aliasKey("Isaac Young", "NC"), { status: "linked", identityId: "id-isaac" }],
])

const dropped = (bouts: GuardBout[], aliases = ALIASES) => new Set(boutsToUnlink(athletes, bouts, aliases, identities).map((b) => b.event_key))

describe("bout link guard", () => {
  it("trusts the bouts over a profile's gender when every bout disagrees with it", () => {
    const taina = { id: "taina", name: "Taina Fernandez", gender: "Male", state: "MD", highschool: "Archbishop Spalding" }
    const fargo = { ...bout("taina", "Taina Fernandez", "MD", "135", "2025-07-15", "fargo-2025-junior-fs"), gender: "F" }
    expect(boutsToUnlink(new Map([[taina.id, taina]]), [fargo], new Map(), new Map())).toEqual([])
  })

  it("does not read a bordering state, or a profile with no state, as a namesake", () => {
    const nate = { id: "nate", name: "Nate Gardner", gender: "Male", state: null, highschool: "Buford" }
    expect(boutsToUnlink(new Map([[nate.id, nate]]), [bout("nate", "Nate Gardner", "SC", "144", "2024-10-25", "super32-2025")], new Map(), new Map())).toEqual([])
  })

  it("takes the Missouri Carson Owens off the NC one, and leaves his own results", () => {
    const out = dropped(CARSON)
    expect(out).toEqual(new Set(["fargo-2026-junior-gr", "nhsca-nationals-2026", "journeymen-fall-classic-2026", "nhsca-national-duals-2026"]))
  })

  it("lets a wrestler bump up a class or two, and never judges the upper weights", () => {
    // Isaac at 182 for a duals team is 20% up: possible, so only his family's word can take it off.
    expect(dropped(ISAAC)).toEqual(new Set())
    const brieon = { id: "brieon", name: "Brieon Mayfield", gender: "Male", state: "NC", highschool: "Jack Britt" }
    const out = boutsToUnlink(
      new Map([[brieon.id, brieon]]),
      [bout("brieon", "Brieon Mayfield", "NC", "215", "2026-10-25", "super32-2026"), bout("brieon", "Brieon Mayfield", "TRIANGLE WRESTLING CLUB", "285", "2026-10-10", "i64")],
      new Map(),
      new Map(),
    )
    expect(out).toEqual([])
  })

  it("does not take a club's state for the wrestler's when the weight fits", () => {
    const b = bout("isaac", "Isaac Young", "SC", "157", "2026-04-18", "sc-club-event")
    expect(dropped([...ISAAC, b]).has("sc-club-event")).toBe(false)
  })

  it("skips kilogram weights", () => {
    const b = bout("isaac", "Isaac Young", "NC United - W", "71", "2026-06-20", "ucd")
    expect(dropped([...ISAAC, b]).has("ucd")).toBe(false)
  })

  it("keeps a family's 'not me' through every later import", () => {
    const aliases = new Map(ALIASES)
    aliases.set(aliasKey("Isaac Young", "FOWR"), { status: "rejected" })
    aliases.set(aliasKey("Isaac Young", "Forge wrestling"), { status: "rejected" })
    expect(dropped(ISAAC, aliases)).toEqual(new Set(["tarheel-classic-2026", "super32-early-entry-nc-2026"]))
  })

  it("never drops a bout the registry links to him, whatever its state code", () => {
    const aliases = new Map(ALIASES)
    aliases.set(aliasKey("Carson Owens", "MO"), { status: "linked", identityId: "id-carson" })
    expect(dropped(CARSON, aliases).has("fargo-2026-junior-gr")).toBe(false)
  })

  it("drops a bout of the other gender", () => {
    const b = { ...bout("isaac", "Isaac Young", "IL", "152", "2026-07-15", "fargo-2026-junior-wfs"), gender: "F" }
    expect(dropped([...ISAAC, b]).has("fargo-2026-junior-wfs")).toBe(true)
    // A state tournament where girls wrestle in the boys' brackets is left alone.
    const v = { ...bout("isaac", "Isaac Young", "Pisgah", "152", "2026-02-21", "vhsl-states-2026"), gender: "F" }
    expect(dropped([...ISAAC, v]).has("vhsl-states-2026")).toBe(false)
  })

  it("takes off events a person said are not his, even under his own state", () => {
    const id = "ddea34af-ae6a-4880-8a1c-687576bef1fe"
    expect(NOT_HIS_EVENTS[id]?.events).toContain("super32-2025")
    const jacob = { id, name: "Jacob Perry", gender: "Male", state: "NC", highschool: "New Bern" }
    const out = boutsToUnlink(
      new Map([[id, jacob]]),
      [bout(id, "Jacob Perry", "NC", "150", "2024-10-26", "super32-2025"), bout(id, "Jacob Perry", "NC", "152", "2025-03-27", "nhsca-nationals-2025")],
      new Map([[aliasKey("Jacob Perry", "NC"), { status: "linked" }]]),
      new Map(),
    )
    expect(out.map((b) => b.event_key)).toEqual(["super32-2025"])
  })
})
