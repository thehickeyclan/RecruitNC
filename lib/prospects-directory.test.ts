import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchProspectDirectoryPage } from "./prospects-directory"

/** A stand-in for the athletes query: records each filter and returns the rows it was given. */
function fakeSupabase(rows: Array<Record<string, unknown>>) {
  const calls: Array<[string, ...unknown[]]> = []
  const q: Record<string, unknown> = {}
  for (const m of ["select", "order", "range", "eq", "gte", "lte", "or"]) {
    q[m] = (...args: unknown[]) => (calls.push([m, ...args]), q)
  }
  q.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null })
  const supabase = { from: () => q } as unknown as SupabaseClient
  return { supabase, filters: () => calls.filter(([m]) => m === "eq" || m === "or") }
}

describe("fetchProspectDirectoryPage state filter", () => {
  /*
   * 2 Nov 2026: the North Carolina list read every athlete and kept anyone whose state was not on
   * a short list of neighbours, so 2,154 of its 3,165 rows were other states' placers.
   */
  it("narrows North Carolina in the query, by the NC flag", async () => {
    const { supabase, filters } = fakeSupabase([])
    await fetchProspectDirectoryPage(supabase, {})
    expect(filters()).toEqual([["eq", "is_nc_athlete", true]])
  })

  it("narrows another state by its code, never NC-flagged", async () => {
    const { supabase, filters } = fakeSupabase([])
    await fetchProspectDirectoryPage(supabase, { state: "sc" })
    expect(filters()).toEqual([
      ["eq", "state", "SC"],
      ["eq", "is_nc_athlete", false],
    ])
  })

  it("asks for North Carolina plus the other states in one filter for 'All states'", async () => {
    const { supabase, filters } = fakeSupabase([])
    await fetchProspectDirectoryPage(supabase, { state: "NC", withStates: ["SC", "NC", "VA"] })
    expect(filters()).toEqual([["or", "is_nc_athlete.eq.true,and(state.in.(SC,VA),is_nc_athlete.eq.false)"]])
  })

  it("returns what the query returned, with no second guess by state name", async () => {
    const { supabase } = fakeSupabase([
      { id: "1", name: "A", state: "NC" },
      { id: "2", name: "B", state: null },
    ])
    const { prospects } = await fetchProspectDirectoryPage(supabase, {})
    expect(prospects.map((p) => p.id)).toEqual(["1", "2"])
  })
})
