import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { loadNationalResultsFromBouts, summarizeEvent } from "./national-results-from-bouts"

describe("summarizeEvent", () => {
  it("reads the finish from the placement match: losing the 3rd-place match is fourth", () => {
    const s = summarizeEvent([
      { round: "Round of 64", win: true, is_bye: false, weight_class: "145" },
      { round: "Consi-Semis", win: true, is_bye: false, weight_class: "145" },
      { round: "3rd Place", win: false, is_bye: false, weight_class: "145" },
    ])
    expect(s).toMatchObject({ wins: 2, losses: 1, record: "2-1", placement: 4, weight: "145" })
  })

  it("knows each event's label for the final: NHSCA and Super 32 'Finals', Fargo '1st Place Match'", () => {
    expect(summarizeEvent([{ round: "Finals", win: true, is_bye: false, weight_class: "157" }]).placement).toBe(1)
    expect(summarizeEvent([{ round: "1st Place Match", win: false, is_bye: false, weight_class: "157" }]).placement).toBe(2)
    expect(summarizeEvent([{ round: "7th Place Match", win: true, is_bye: false, weight_class: "157" }]).placement).toBe(7)
  })

  it("does not count a bye as a match, and gives no place to a wrestler who never reached a placement match", () => {
    const s = summarizeEvent([
      { round: "Round of 128", win: true, is_bye: true, weight_class: "126" },
      { round: "Round of 64", win: false, is_bye: false, weight_class: "126" },
      { round: "Consi of 64 #1", win: false, is_bye: false, weight_class: "126" },
    ])
    expect(s).toMatchObject({ record: "0-2", placement: null })
  })

  it("never reads a semifinal as a placement", () => {
    expect(summarizeEvent([{ round: "Semi-Finals", win: true, is_bye: false, weight_class: "120" }]).placement).toBeNull()
  })
})

describe("loadNationalResultsFromBouts", () => {
  it("returns nothing for a North Carolina wrestler without touching the database", async () => {
    const from = vi.fn()
    const out = await loadNationalResultsFromBouts({ from } as never, { id: "x", state: "NC", is_nc_athlete: true })
    expect(out).toEqual({ nhsca: [], super32: [], fargo: [], other: [] })
    expect(from).not.toHaveBeenCalled()
  })

  it("returns nothing for a flagged NC wrestler whose state column says otherwise", async () => {
    const from = vi.fn()
    await loadNationalResultsFromBouts({ from } as never, { id: "x", state: "SC", is_nc_athlete: true })
    expect(from).not.toHaveBeenCalled()
  })
})
