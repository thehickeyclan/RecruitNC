import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * These tests guard a public-disclosure boundary, not just behavior. The failure they exist to catch is
 * an unreleased weight class — or a seed, a jacket size, or a school — reaching a visitor.
 */

type Row = Record<string, unknown>

const state = {
  publication: [] as Row[],
  invitations: [] as Row[],
  athletes: [] as Row[],
  /** Every (table, columns) pair the module asked for, so tests can assert nothing broad was selected. */
  selects: [] as { table: string; columns: string }[],
}

function makeQuery(table: string, rows: Row[]) {
  let result = [...rows]
  const q: Record<string, unknown> = {
    select(columns: string) {
      state.selects.push({ table, columns })
      return q
    },
    eq(col: string, val: unknown) {
      result = result.filter((r) => r[col] === val)
      return q
    },
    in(col: string, vals: unknown[]) {
      result = result.filter((r) => vals.includes(r[col]))
      return q
    },
    not(col: string, _op: string, _val: unknown) {
      result = result.filter((r) => r[col] !== null && r[col] !== undefined)
      return q
    },
    then(resolve: (v: { data: Row[]; error: null }) => unknown) {
      return Promise.resolve({ data: result, error: null }).then(resolve)
    },
  }
  return q
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "toc_field_publication_status") return makeQuery(table, state.publication)
      if (table === "toc_invitations") return makeQuery(table, state.invitations)
      if (table === "athletes") return makeQuery(table, state.athletes)
      throw new Error(`unexpected table ${table}`)
    },
  }),
}))

import { getPublicAnnouncedWeight, hasAnyAnnouncedWeight, listPublicWeightTiles } from "./public-announced-field"

beforeEach(() => {
  state.selects = []
  state.publication = [
    // 117 released to the public.
    { weight_class: 117, announced_at: "2026-08-14T18:00:00Z", athlete_field_locked: true },
    // 125 is finished internally but NOT released — the exact case that must stay private.
    { weight_class: 125, announced_at: null, athlete_field_locked: true },
  ]
  state.invitations = [
    { athlete_id: "a1", weight_class: 117, status: "confirmed", photo_release_accepted: true, seed: 1, jacket_size: "L", medical_notes: "asthma" },
    { athlete_id: "a2", weight_class: 117, status: "confirmed", photo_release_accepted: false, seed: 2, jacket_size: "M", medical_notes: null },
    { athlete_id: "a3", weight_class: 117, status: "declined", photo_release_accepted: true, seed: null },
    { athlete_id: "b1", weight_class: 125, status: "confirmed", photo_release_accepted: true, seed: 1 },
  ]
  state.athletes = [
    { id: "a1", name: "Zeb Wilson", graduationyear: 2027, wrestlingClub: "Dark Horse", photourl: "/z.jpg", highschool: "Davie" },
    { id: "a2", name: "Aaron Brooks", graduationyear: 2028, wrestlingClub: "Team NC", photourl: "/a.jpg", highschool: "Cape Fear" },
    { id: "a3", name: "Declined Kid", graduationyear: 2027, wrestlingClub: null, photourl: "/d.jpg", highschool: "Wakefield" },
    { id: "b1", name: "Hidden Athlete", graduationyear: 2027, wrestlingClub: "Secret", photourl: "/b.jpg", highschool: "Leesville" },
  ]
})

describe("announced gate", () => {
  it("returns the field for a released weight", async () => {
    const field = await getPublicAnnouncedWeight(117)
    expect(field).not.toBeNull()
    expect(field?.athletes.map((a) => a.name)).toEqual(["Aaron Brooks", "Zeb Wilson"])
  })

  it("returns null for a weight that is locked but not released", async () => {
    // The whole drip release depends on this: locked !== public.
    expect(await getPublicAnnouncedWeight(125)).toBeNull()
  })

  it("returns null for a weight with no publication row at all", async () => {
    expect(await getPublicAnnouncedWeight(133)).toBeNull()
  })

  it("returns null for a weight class that does not exist", async () => {
    expect(await getPublicAnnouncedWeight(999)).toBeNull()
    expect(await getPublicAnnouncedWeight(Number.NaN)).toBeNull()
  })

  it("treats a missing announced_at column as nothing being released", async () => {
    // A migration gap must fail closed, never publish the whole field.
    state.publication = [{ weight_class: 117, athlete_field_locked: true }]
    expect(await getPublicAnnouncedWeight(117)).toBeNull()
    expect(await hasAnyAnnouncedWeight()).toBe(false)
  })
})

describe("public payload contains nothing private", () => {
  it("omits seed, jacket size, medical notes and school", async () => {
    const field = await getPublicAnnouncedWeight(117)
    const serialized = JSON.stringify(field)
    for (const leak of ["seed", "jacket", "medical", "asthma", "highschool", "Davie", "Cape Fear"]) {
      expect(serialized.toLowerCase()).not.toContain(leak.toLowerCase())
    }
  })

  it("exposes only the agreed keys per athlete", async () => {
    const field = await getPublicAnnouncedWeight(117)
    for (const a of field?.athletes ?? []) {
      expect(Object.keys(a).sort()).toEqual(["athleteId", "club", "graduationYear", "name", "photoUrl"])
    }
  })

  it("never issues a select(*) against invitations or athletes", async () => {
    await getPublicAnnouncedWeight(117)
    const broad = state.selects.filter((s) => s.columns.includes("*"))
    expect(broad).toEqual([])
  })
})

describe("field contents", () => {
  it("includes confirmed athletes only", async () => {
    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes.map((a) => a.name)).not.toContain("Declined Kid")
  })

  it("withholds the photo when the athlete did not accept the release", async () => {
    const field = await getPublicAnnouncedWeight(117)
    const brooks = field?.athletes.find((a) => a.name === "Aaron Brooks")
    const wilson = field?.athletes.find((a) => a.name === "Zeb Wilson")
    expect(brooks?.photoUrl).toBeNull()
    expect(wilson?.photoUrl).toBe("/z.jpg")
  })

  it("sorts alphabetically so row order cannot reveal seeding", async () => {
    // a1/Wilson is seed 1 and appears first in the source rows; alphabetical order must move him last.
    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes.map((a) => a.name)).toEqual(["Aaron Brooks", "Zeb Wilson"])
  })
})

describe("hub tiles", () => {
  it("lists every weight but only counts released ones", async () => {
    const tiles = await listPublicWeightTiles()
    expect(tiles).toHaveLength(11)

    const t117 = tiles.find((t) => t.weightClass === 117)
    expect(t117).toMatchObject({ announced: true, athleteCount: 2, announcedAt: "2026-08-14T18:00:00Z" })

    const t125 = tiles.find((t) => t.weightClass === 125)
    expect(t125).toMatchObject({ announced: false, athleteCount: 0, announcedAt: null })
  })

  it("leaks no build progress for unreleased weights", async () => {
    const tiles = await listPublicWeightTiles()
    // 125 has a confirmed athlete internally; the tile must not hint at it.
    for (const tile of tiles.filter((t) => !t.announced)) {
      expect(tile.athleteCount).toBe(0)
      expect(Object.keys(tile).sort()).toEqual(["announced", "announcedAt", "athleteCount", "weightClass"])
    }
  })
})
