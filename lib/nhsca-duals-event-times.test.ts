import { describe, expect, it } from "vitest"
import {
  NHSCA_FIRST_ROUND_TARGET_MS,
  NHSCA_WEIGH_IN_TARGET_MS,
  easternCalendarDaysUntil,
  easternWallClockMs,
  getNhscaDualsCountdownPhase,
  nhscaDualsCountdownTargetMs,
} from "@/lib/nhsca-duals-event-times"

describe("nhsca-duals-event-times", () => {
  it("weigh-in is Fri May 22 2026 2:00 PM Eastern (EDT → UTC+4)", () => {
    expect(new Date(NHSCA_WEIGH_IN_TARGET_MS).toISOString()).toBe("2026-05-22T18:00:00.000Z")
  })

  it("first round is Sat May 23 2026 8:00 AM Eastern", () => {
    expect(new Date(NHSCA_FIRST_ROUND_TARGET_MS).toISOString()).toBe("2026-05-23T12:00:00.000Z")
  })

  it("Wed May 20 afternoon ET shows 2 calendar days until Friday weigh-ins", () => {
    const wedAfternoon = easternWallClockMs(2026, 5, 20, 15, 0)
    expect(easternCalendarDaysUntil(wedAfternoon, NHSCA_WEIGH_IN_TARGET_MS)).toBe(2)
  })

  it("Thu May 21 evening ET shows 1 calendar day until Friday weigh-ins", () => {
    const thuEvening = easternWallClockMs(2026, 5, 21, 20, 0)
    expect(easternCalendarDaysUntil(thuEvening, NHSCA_WEIGH_IN_TARGET_MS)).toBe(1)
  })

  it("Fri May 22 3 PM ET is first_round phase (after weigh-ins, before Sat 8 AM)", () => {
    const friAfternoon = easternWallClockMs(2026, 5, 22, 15, 0)
    expect(getNhscaDualsCountdownPhase(friAfternoon)).toBe("first_round")
    expect(nhscaDualsCountdownTargetMs("first_round")).toBe(NHSCA_FIRST_ROUND_TARGET_MS)
    expect(easternCalendarDaysUntil(friAfternoon, NHSCA_FIRST_ROUND_TARGET_MS)).toBe(1)
  })

  it("Sat May 23 9 AM ET is underway", () => {
    const satMorning = easternWallClockMs(2026, 5, 23, 9, 0)
    expect(getNhscaDualsCountdownPhase(satMorning)).toBe("underway")
  })
})
