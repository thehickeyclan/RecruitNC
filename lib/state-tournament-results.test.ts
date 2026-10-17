import { describe, expect, it } from "vitest"
import { getStateTournamentResultsForAthlete } from "@/lib/state-tournament-results"

/** Enough of a Supabase client to record the filters and hand back rows. */
function clientReturning(rows: unknown[], spy?: { filters: Array<[string, unknown]> }) {
  const q: Record<string, unknown> = {}
  q.select = () => q
  q.eq = (col: string, val: unknown) => {
    spy?.filters.push([col, val])
    return q
  }
  ;(q as { then: unknown }).then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null })
  return { from: () => q } as never
}

const row = {
  season: 2026,
  state: "SC",
  classification: "4A",
  weight: "132",
  place: 2,
  wrestler_name: "Sample Wrestler",
  school_clean: "Fort Dorchester",
  school_raw: "FORT DORCHESTER HS",
}

describe("getStateTournamentResultsForAthlete", () => {
  it("reads a South Carolina wrestler's placements into the shape the profile already renders", async () => {
    const out = await getStateTournamentResultsForAthlete(clientReturning([row]), { id: "a1", state: "SC" })
    expect(out).toEqual([
      { year: 2026, classification: "4A", weight_class: "132", place: 2, school: "Fort Dorchester", wrestler_name: "Sample Wrestler" },
    ])
  })

  it("matches on the linked profile id and the state, never on a name", async () => {
    /* `athlete_id`, like the NCHSAA table — not `source_athlete_id`, which is a FloArena id. */
    /* 133 placer names already repeat across states; a wrong placement is worse than none. */
    const spy = { filters: [] as Array<[string, unknown]> }
    await getStateTournamentResultsForAthlete(clientReturning([row], spy), { id: "a1", state: "SC" })
    expect(spy.filters).toEqual([
      ["athlete_id", "a1"],
      ["state", "SC"],
    ])
  })

  it("returns nothing for a North Carolina wrestler, whose placements come from the NCHSAA table", async () => {
    /* Reading both tables would print every NC placement twice. */
    expect(await getStateTournamentResultsForAthlete(clientReturning([row]), { id: "a1", state: "NC" })).toEqual([])
    expect(await getStateTournamentResultsForAthlete(clientReturning([row]), { id: "a1", state: null })).toEqual([])
  })

  it("returns nothing without an id, rather than every placer in the state", async () => {
    expect(await getStateTournamentResultsForAthlete(clientReturning([row]), { id: "", state: "SC" })).toEqual([])
  })

  it("keeps a qualifier who did not place, and falls back to the raw school name", async () => {
    const out = await getStateTournamentResultsForAthlete(
      clientReturning([{ ...row, place: null, school_clean: null }]),
      { id: "a1", state: "SC" },
    )
    expect(out[0]!.place).toBeNull()
    expect(out[0]!.school).toBe("FORT DORCHESTER HS")
  })

  it("puts the most recent season first", async () => {
    const out = await getStateTournamentResultsForAthlete(
      clientReturning([{ ...row, season: 2024 }, { ...row, season: 2026 }, { ...row, season: 2025 }]),
      { id: "a1", state: "SC" },
    )
    expect(out.map((r) => r.year)).toEqual([2026, 2025, 2024])
  })
})
