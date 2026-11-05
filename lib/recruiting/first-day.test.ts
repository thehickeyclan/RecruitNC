import { describe, expect, it } from "vitest"

import { firstDayMoves } from "./first-day"

const base = { firstName: "Tyde", athleteId: "a1", profilePercent: 20, profileTodo: "academics", saved: 0, upcomingEvents: 0, suggested: 5 }

describe("firstDayMoves", () => {
  it("is always profile, colleges, event, in that order", () => {
    expect(firstDayMoves(base).map((m) => m.key)).toEqual(["profile", "colleges", "event"])
  })

  it("opens the profile editor on the first open item and shows the percent", () => {
    const [profile] = firstDayMoves(base)
    expect(profile.href).toBe("/athletes/a1?edit=academics")
    expect(profile.why).toContain("20%")
    expect(profile.done).toBe(false)
  })

  it("counts toward five colleges, never past it", () => {
    expect(firstDayMoves(base)[1].why).toContain("0 of 5")
    expect(firstDayMoves({ ...base, saved: 3 })[1]).toMatchObject({ done: false })
    expect(firstDayMoves({ ...base, saved: 7 })[1]).toMatchObject({ done: true })
    expect(firstDayMoves({ ...base, saved: 7 })[1].why).toContain("5 of 5")
  })

  it("sends the family to the map when the shortlist is short or empty", () => {
    expect(firstDayMoves({ ...base, suggested: 3 })[1].why).toContain("then the map")
    expect(firstDayMoves({ ...base, suggested: 0 })[1]).toMatchObject({ href: "/recruiting/college-map" })
  })

  it("ticks each move once it is done", () => {
    const moves = firstDayMoves({ ...base, profilePercent: 100, profileTodo: null, saved: 5, upcomingEvents: 1 })
    expect(moves.every((m) => m.done)).toBe(true)
    expect(moves[0].href).toBe("/athletes/a1")
  })

  it("never uses he or she", () => {
    for (const m of firstDayMoves(base)) expect(`${m.label} ${m.why}`).not.toMatch(/\b(him|her|he|she|his)\b/i)
  })
})
