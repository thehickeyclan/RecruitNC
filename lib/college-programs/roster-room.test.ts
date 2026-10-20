import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { needOf, roomByWeight, roomFor, weightsPublished, type Room } from "@/lib/college-programs/roster-room"

const w = (weight: number | null, finalSeason: number | null) => ({ name: `W${weight}-${finalSeason}`, weight, cls: null, finalSeason, redshirt: false, homeState: null, highSchool: null })

describe("room by weight", () => {
  const room: Room = { season: "2026-27", wrestlers: [w(157, 2027), w(157, 2028), w(157, 2029), w(157, null), w(165, 2028), w(null, 2030)] }

  it("a final season in or before the arrival fall is gone; after it, or unknown, is still there", () => {
    const at157 = roomByWeight(room, "mens", 2027).find((r) => r.weight === 157)!
    expect(at157).toMatchObject({ now: 4, leaving: 1, staying: 3, need: "crowded" })
    const later = roomByWeight(room, "mens", 2028).find((r) => r.weight === 157)!
    expect(later).toMatchObject({ leaving: 2, staying: 2, need: "some" })
  })

  it("an empty weight is a likely need, and every college weight gets a row", () => {
    const rows = roomByWeight(room, "mens", 2028)
    expect(rows).toHaveLength(10)
    expect(rows.find((r) => r.weight === 165)).toMatchObject({ now: 1, staying: 0, need: "likely" })
    expect(rows.find((r) => r.weight === 125)).toMatchObject({ now: 0, need: "likely" })
  })

  it("labels: one or none is a need, two some room, three a crowd", () => {
    expect([0, 1, 2, 3, 6].map(needOf)).toEqual(["likely", "likely", "some", "crowded", "crowded"])
  })

  it("a team that prints weights for under half its roster is said to publish few", () => {
    expect(weightsPublished(room)).toBe(true)
    expect(weightsPublished({ season: "2026-27", wrestlers: [w(null, 2028), w(null, 2029), w(157, 2028)] })).toBe(false)
  })

  it("reads the real v3 pull", () => {
    const ncState = roomFor("north-carolina-state-university-nc-state", "mens")
    expect(ncState?.season).toBe("2026-27")
    expect(ncState && weightsPublished(ncState)).toBe(true)
    expect(roomFor("cornell-university", "mens") && weightsPublished(roomFor("cornell-university", "mens")!)).toBe(false)
  })
})
