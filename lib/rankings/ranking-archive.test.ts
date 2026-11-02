import { describe, expect, it } from "vitest"

import { loadRankedOnLookup } from "./ranking-archive"

/** A Supabase stand-in for the two paged reads the lookup makes. */
function fakeSupabase(tables: Record<string, Array<Record<string, unknown>>>) {
  const query = (rows: Array<Record<string, unknown>>) => {
    const q = {
      select: () => q,
      eq: () => q,
      order: () => q,
      range: async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }),
    }
    return q
  }
  return { from: (t: string) => query(tables[t] ?? []) } as never
}

const row = (rank: number, name: string, weight: string) => ({
  source: "sports_illustrated",
  scope: "weight",
  edition_class_year: 0,
  rank_basis: "weight",
  rank,
  athlete_name: name,
  weight_class: weight,
  high_school: null,
  state: "CO",
})

describe("ranked on the day", () => {
  // Ty Eversman: SI #28 at 144 in April, #19 at 150 in September, off the October list.
  const supabase = fakeSupabase({
    national_rankings_archive: [{ ...row(28, "Ty Eversman", "144"), published_on: "2026-04-07", source_file: "si-M-2026-04-07.json" }],
    national_rankings: [
      { ...row(19, "Ty Eversman", "150"), ranking_month: "2026-09-01", created_at: "2026-09-06T16:03:12Z" },
      { ...row(1, "Arseni Kikiniou", "150"), ranking_month: "2026-10-01", created_at: "2026-10-30T12:00:00Z" },
    ],
  })

  it("keeps the rank he held at Super 32, and says when", async () => {
    const lookup = await loadRankedOnLookup(supabase, "M")
    expect(lookup("Ty Eversman", "2026-10-24")).toEqual([expect.objectContaining({ rank: 19, asOf: "Sep 2026" })])
  })

  it("does not let an older edition of the same list stand beside the newer one", async () => {
    const lookup = await loadRankedOnLookup(supabase, "M")
    expect(lookup("Ty Eversman", "2026-10-24").some((r) => r.rank === 28)).toBe(false)
    expect(lookup("Ty Eversman", "2026-05-01")).toEqual([expect.objectContaining({ rank: 28 })])
  })

  it("dates a list from the day it was loaded, and drops him once it is in effect", async () => {
    const lookup = await loadRankedOnLookup(supabase, "M")
    expect(lookup("Ty Eversman", "2026-10-31")).toEqual([])
  })
})
