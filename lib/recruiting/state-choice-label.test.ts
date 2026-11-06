/**
 * A state picker names the state, and does not grade it.
 *
 * " · not ranked yet" used to hang off every live state without a ranking board, so Virginia,
 * Tennessee and Georgia read as second-class next to the Carolinas in the one place a coach is
 * simply choosing whose wrestlers to look at (Matt, 6 November 2026). These tests hold the label to
 * the state's name plus the one suffix that changes what the person is looking at.
 */
import { describe, expect, it } from "vitest"
import { RECRUITING_BRAND, isRankedState, stateChoiceLabel } from "@/lib/recruiting/brand"

const state = (code: string) => {
  const s = RECRUITING_BRAND.states.find((x) => x.code === code)
  if (!s) throw new Error(`no such state in the brand: ${code}`)
  return s
}

describe("stateChoiceLabel", () => {
  it("never says anything about rankings, for any state, on any address", () => {
    for (const s of RECRUITING_BRAND.states) {
      for (const opts of [{}, { brandHost: true }, { onRecruitWrestlers: true }, { brandHost: true, onRecruitWrestlers: true }]) {
        expect(stateChoiceLabel(s, opts).toLowerCase()).not.toContain("rank")
      }
    }
  })

  it("names a live state with no ranking board exactly as it names a ranked one", () => {
    // Virginia carries `ranked: false`; South Carolina has a board. Both read as the plain name.
    expect(isRankedState(state("VA"))).toBe(false)
    expect(isRankedState(state("SC"))).toBe(true)
    expect(stateChoiceLabel(state("VA"), { brandHost: true })).toBe("Virginia")
    expect(stateChoiceLabel(state("SC"), { brandHost: true })).toBe("South Carolina")
  })

  it("marks a state that is not live as staff only, so nobody mistakes it for open", () => {
    expect(state("OH").live).toBe(false)
    expect(stateChoiceLabel(state("OH"), { brandHost: true })).toBe("Ohio (staff only)")
  })

  it("drops the staff-only mark on RecruitWrestlers, which carries every state", () => {
    expect(stateChoiceLabel(state("OH"), { brandHost: true, onRecruitWrestlers: true })).toBe("Ohio")
  })

  it("prefixes the state brand when the address is not the state's own host", () => {
    expect(stateChoiceLabel(state("VA"))).toBe("RecruitVA · Virginia")
    expect(stateChoiceLabel(state("OH"))).toBe("RecruitOH · Ohio (staff only)")
  })
})
