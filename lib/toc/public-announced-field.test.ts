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
  placements: [] as Row[],
  matches: [] as Row[],
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
      if (table === "nhsca_placements") return makeQuery(table, state.placements)
      if (table === "matches") return makeQuery(table, state.matches)
      throw new Error(`unexpected table ${table}`)
    },
  }),
}))

import {
  buildAthleteSummary,
  FORBIDDEN_SUMMARY_COLUMNS,
  formatPlacement,
  pickHeadlineCredential,
  publicAchievementLines,
  getPublicAnnouncedWeight,
  hasAnyAnnouncedWeight,
  listPublicWeightTiles,
  surnameSortKey,
} from "./public-announced-field"

beforeEach(() => {
  state.selects = []
  state.placements = []
  state.matches = []
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
      expect(Object.keys(a).sort()).toEqual([
        "athleteId",
        "club",
        "collegeCommit",
        "graduationYear",
        "name",
        "photoUrl",
        "results",
        "summary",
      ])
    }
  })

  it("never selects the prose bio columns, which embed the athlete's school", async () => {
    // Real data: "Liam Myles is a wrestler at Union Pines High School..." — unsanitizable, so never queried.
    await getPublicAnnouncedWeight(117)
    const athleteSelects = state.selects.filter((s) => s.table === "athletes").map((s) => s.columns)
    for (const columns of athleteSelects) {
      for (const forbidden of [...FORBIDDEN_SUMMARY_COLUMNS, "highschool"]) {
        expect(columns).not.toContain(forbidden)
      }
    }
  })

  it("does not publish rankings, which would undercut 'not seeded'", async () => {
    await getPublicAnnouncedWeight(117)
    const athleteSelects = state.selects.filter((s) => s.table === "athletes").map((s) => s.columns)
    for (const columns of athleteSelects) {
      expect(columns).not.toContain("prospect_ranking")
      expect(columns).not.toContain("rankings")
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

  it("sorts by surname, not by first name", async () => {
    // The real 117 field: sorting the whole string ordered these by given name, which does not read as
    // alphabetical to anyone scanning a roster.
    state.invitations = ["Alexander Moody", "Matthew Akins", "Xavier Bernthal", "Kristopher Kerr Jr"].map(
      (_n, i) => ({ athlete_id: `s${i}`, weight_class: 117, status: "confirmed", photo_release_accepted: true }),
    )
    state.athletes = ["Alexander Moody", "Matthew Akins", "Xavier Bernthal", "Kristopher Kerr Jr"].map((n, i) => ({
      id: `s${i}`,
      name: n,
      graduationyear: 2027,
      wrestlingClub: null,
      photourl: null,
    }))

    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes.map((a) => a.name)).toEqual([
      "Matthew Akins",
      "Xavier Bernthal",
      "Kristopher Kerr Jr",
      "Alexander Moody",
    ])
  })
})

describe("summary fields", () => {
  beforeEach(() => {
    state.invitations = [
      { athlete_id: "c1", weight_class: 117, status: "confirmed", photo_release_accepted: true },
      { athlete_id: "c2", weight_class: 117, status: "confirmed", photo_release_accepted: true },
    ]
    state.athletes = [
      {
        id: "c1",
        name: "Approved Commit",
        graduationyear: 2027,
        wrestlingClub: "RAW",
        photourl: null,
        college: "Binghamton",
        commitment_approved: true,
        nhsca_2026_placement: "3rd",
        super_32_2025_placement: "Round of 16",
        nhsca_2025_placement: "5th",
        nhsca_2024_placement: "2nd",
        bio: "Wrestles at Union Pines High School",
      },
      {
        id: "c2",
        name: "Unapproved Commit",
        graduationyear: 2028,
        wrestlingClub: null,
        photourl: null,
        college: "Wishful State",
        commitment_approved: false,
      },
    ]
  })

  it("publishes an approved commitment and withholds an unapproved one", async () => {
    const field = await getPublicAnnouncedWeight(117)
    const approved = field?.athletes.find((a) => a.name === "Approved Commit")
    const unapproved = field?.athletes.find((a) => a.name === "Unapproved Commit")
    expect(approved?.collegeCommit).toBe("Binghamton")
    expect(unapproved?.collegeCommit).toBeNull()
  })

  it("lists national results newest first and caps the count", async () => {
    const field = await getPublicAnnouncedWeight(117)
    const a = field?.athletes.find((x) => x.name === "Approved Commit")
    expect(a?.results).toEqual(["2026 NHSCA 3rd", "2025 Super 32 Round of 16", "2025 NHSCA 5th"])
  })

  it("returns no results rather than inventing them when the athlete has none", async () => {
    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes.find((a) => a.name === "Unapproved Commit")?.results).toEqual([])
  })

  it("keeps school names out of the payload even when the source row carries a bio", async () => {
    const field = await getPublicAnnouncedWeight(117)
    const serialized = JSON.stringify(field).toLowerCase()
    expect(serialized).not.toContain("union pines")
    expect(serialized).not.toContain("high school")
  })
})

describe("national results from nhsca_placements", () => {
  beforeEach(() => {
    state.placements = [
      { athlete_id: "a1", year: 2025, placement: "6", high_school: "Davie", seed: 2 },
      { athlete_id: "a1", year: 2026, placement: "4", high_school: "Davie", seed: 1 },
    ]
  })

  it("formats and orders newest first", async () => {
    const field = await getPublicAnnouncedWeight(117)
    const wilson = field?.athletes.find((a) => a.name === "Zeb Wilson")
    expect(wilson?.results).toEqual(["2026 NHSCA 4th", "2025 NHSCA 6th"])
  })

  it("never selects high_school or seed from the placements table", async () => {
    await getPublicAnnouncedWeight(117)
    const sel = state.selects.filter((s) => s.table === "nhsca_placements").map((s) => s.columns)
    expect(sel.length).toBeGreaterThan(0)
    for (const columns of sel) {
      expect(columns).not.toContain("high_school")
      expect(columns).not.toContain("seed")
      expect(columns).not.toContain("*")
    }
  })

  it("keeps the placements school out of the payload", async () => {
    const field = await getPublicAnnouncedWeight(117)
    expect(JSON.stringify(field)).not.toContain("Davie")
  })
})

describe("publicAchievementLines", () => {
  it("keeps curated accomplishment entries", () => {
    expect(publicAchievementLines(["2026 State Champion", "2x Regional Champion", "3x All Conference."])).toEqual([
      "2026 State Champion",
      "2x Regional Champion",
      "3x All Conference",
    ])
  })

  it("drops any entry that names a school", () => {
    // Free text an admin typed, so it has to be screened rather than trusted.
    expect(
      publicAchievementLines(["2026 State Champion", "Team captain at Davie High School", "Prep National qualifier"]),
    ).toEqual(["2026 State Champion"])
  })

  it("tolerates a bare string, null and junk", () => {
    expect(publicAchievementLines("45-8 as a freshman")).toEqual(["45-8 as a freshman"])
    expect(publicAchievementLines(null)).toEqual([])
    expect(publicAchievementLines([1, null, "  "])).toEqual([])
  })
})

describe("buildAthleteSummary", () => {
  it("writes a paragraph in the order a reader expects", () => {
    const summary = buildAthleteSummary({
      name: "Jaxon Thomas",
      graduationYear: 2027,
      club: "Darkhorse",
      collegeCommit: "Binghamton",
      achievements: ["2026 State Champion", "2x Regional Champion", "3x All Conference"],
      results: {
        seasonRecord: { season: "2024-25", wins: 59, losses: 1, pins: 30 },
        allAmericanYear: null,
        lines: ["2024-25 · 59-1 · 30 pins", "2026 NHSCA 4-2"],
      },
    })
    expect(summary).toBe(
      "Jaxon Thomas is a Class of 2027 wrestler who competes with Darkhorse, and a 2026 State Champion. " +
        "Jaxon's accomplishments include 2x Regional Champion and 3x All Conference. " +
        "Recent results: 2024-25 · 59-1 · 30 pins; 2026 NHSCA 4-2. " +
        "Jaxon is committed to Binghamton.",
    )
  })

  it("still says something useful with only a club", () => {
    const summary = buildAthleteSummary({
      name: "Xavier Bernthal",
      graduationYear: 2029,
      club: "OTM Walters",
      collegeCommit: null,
      achievements: [],
      results: { seasonRecord: null, allAmericanYear: null, lines: [] },
    })
    expect(summary).toBe("Xavier Bernthal is a Class of 2029 wrestler who competes with OTM Walters.")
  })

  it("handles a single accomplishment without a dangling conjunction", () => {
    const summary = buildAthleteSummary({
      name: "Solo Kid",
      graduationYear: null,
      club: null,
      collegeCommit: null,
      achievements: ["45-8 last season as a freshman"],
      results: { seasonRecord: null, allAmericanYear: null, lines: [] },
    })
    expect(summary).toBe("Solo Kid is a wrestler. Solo's accomplishments include 45-8 last season as a freshman.")
  })
})

describe("pickHeadlineCredential", () => {
  const noSeason = { seasonRecord: null, allAmericanYear: null }

  it("leads with an NHSCA All-American finish over a state title", () => {
    const h = pickHeadlineCredential({
      ...noSeason,
      allAmericanYear: 2026,
      achievements: ["2026 State Champion"],
    })
    expect(h?.phrase).toBe("a 2026 NHSCA All-American")
    // The state title is left for the following sentence rather than consumed.
    expect(h?.usedAchievement).toBeNull()
  })

  it("ranks state champion above placer above qualifier", () => {
    expect(
      pickHeadlineCredential({ ...noSeason, achievements: ["State Qualifier", "2026 State Champion"] })?.phrase,
    ).toBe("a 2026 State Champion")
    expect(pickHeadlineCredential({ ...noSeason, achievements: ["State Qualifier", "State Placer"] })?.phrase).toBe(
      "a State Placer",
    )
    expect(pickHeadlineCredential({ ...noSeason, achievements: ["State Qualifier"] })?.phrase).toBe("a State Qualifier")
  })

  it("reads a placing written as prose", () => {
    const h = pickHeadlineCredential({
      ...noSeason,
      achievements: ["45-8 last wrestling season as a freshman. 4th at regionals and 4th at states in 7A"],
    })
    expect(h?.phrase).toContain("4th at states in 7A")
  })

  it("falls back to a winning season when there is no state or national credential", () => {
    const h = pickHeadlineCredential({
      achievements: [],
      allAmericanYear: null,
      seasonRecord: { season: "2025-26", wins: 42, losses: 4, pins: 24 },
    })
    expect(h?.phrase).toBe("coming off a 2025-26 42-4 season")
    expect(h?.usedSeasonRecord).toBe(true)
  })

  it("does not lead with a losing season", () => {
    expect(
      pickHeadlineCredential({
        achievements: [],
        allAmericanYear: null,
        seasonRecord: { season: "2025-26", wins: 8, losses: 20, pins: 1 },
      }),
    ).toBeNull()
  })
})

describe("formatPlacement", () => {
  it("turns a bare placing into an ordinal", () => {
    expect(formatPlacement("4")).toBe("4th")
    expect(formatPlacement("1")).toBe("1st")
    expect(formatPlacement("2")).toBe("2nd")
    expect(formatPlacement("3")).toBe("3rd")
    expect(formatPlacement("11")).toBe("11th")
    expect(formatPlacement("22")).toBe("22nd")
  })

  it("leaves non-numeric placings alone", () => {
    expect(formatPlacement("Round of 16")).toBe("Round of 16")
    expect(formatPlacement("3rd")).toBe("3rd")
  })
})

describe("surnameSortKey", () => {
  it("keys on the surname", () => {
    expect(surnameSortKey("Alexander Moody")).toBe("moody alexander")
    expect(surnameSortKey("Matthew Akins")).toBe("akins matthew")
  })

  it("ignores generational suffixes", () => {
    expect(surnameSortKey("Kristopher Kerr Jr")).toBe("kerr kristopher")
    expect(surnameSortKey("Bob Smith III")).toBe("smith bob")
    expect(surnameSortKey("Al Jones Sr.")).toBe("jones al")
  })

  it("treats a trailing name part as the surname for multi-part given names", () => {
    expect(surnameSortKey("Gael Guerrero Perez")).toBe("perez gael guerrero")
  })

  it("handles single names and blanks without throwing", () => {
    expect(surnameSortKey("Cyclone")).toBe("cyclone")
    expect(surnameSortKey("   ")).toBe("")
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
