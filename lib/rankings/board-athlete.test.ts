import { describe, expect, it } from "vitest"
import { normalizeBoardAthlete, BOARD_ARRAY_FIELDS } from "./board-athlete"

describe("normalizeBoardAthlete", () => {
  it("wraps a stale pre-array all_american string instead of throwing", () => {
    // Exactly the cached shape that took the board down: `all_american` as a string.
    const stale = { id: "a1", all_american: "NHSCA 2026 1st" }
    const row = normalizeBoardAthlete(stale) as unknown as { all_american: string[] }
    expect(row.all_american).toEqual(["NHSCA 2026 1st"])
    expect(() => row.all_american.map((f) => f)).not.toThrow()
  })

  it("gives every iterated field an array, whatever arrived", () => {
    const row = normalizeBoardAthlete({ id: "a1" }) as Record<string, unknown>
    for (const field of BOARD_ARRAY_FIELDS) expect(Array.isArray(row[field])).toBe(true)
  })

  it("treats null and empty string as no results, not a blank badge", () => {
    const row = normalizeBoardAthlete({ all_american: null, state_placements: "" }) as unknown as Record<
      string,
      unknown[]
    >
    expect(row.all_american).toEqual([])
    expect(row.state_placements).toEqual([])
  })

  it("leaves a correctly shaped row untouched", () => {
    const good = { all_american: ["NHSCA 2026 1st"], evidence: [{ label: "x" }] }
    const row = normalizeBoardAthlete(good) as typeof good
    expect(row.all_american).toEqual(["NHSCA 2026 1st"])
    expect(row.evidence).toEqual([{ label: "x" }])
  })
})
