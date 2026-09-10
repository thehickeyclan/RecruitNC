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
  fargoResults: [] as Row[],
  matches: [] as Row[],
  stateResults: [] as Row[],
  coachDesignations: [] as Row[],
  coachTickets: [] as Row[],
  /** Every (table, columns) pair the module asked for, so tests can assert nothing broad was selected. */
  selects: [] as { table: string; columns: string }[],
  /** Extra sources the shared credential engine consults; empty unless a test cares. */
  engineTables: {} as Record<string, Row[]>,
}

/**
 * Tables reached only through {@link loadAthleteCredentials}, not by this module directly.
 *
 * They are listed rather than blanket-allowed so that a genuinely unexpected table still throws —
 * the point of the harness is that a new query cannot appear unnoticed on a public path.
 */
const SHARED_ENGINE_TABLES = [
  "nc_united_tournament_results",
  "nc_united_wrestlers",
  "nhsca_roster",
  "other_tournament_bouts",
  "other_tournament_results",
  "super32_results",
  "wrestling_nhsca_results",
]

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
    /*
     * The credential engine builds longer chains than this module ever did. A missing method here
     * throws, the engine catches it as "no credentials", and the test reads as a wrestler with an
     * empty résumé — so these exist to make a harness gap fail loudly rather than quietly.
     */
    ilike(col: string, val: string) {
      const re = new RegExp(`^${String(val).replace(/%/g, ".*")}$`, "i")
      result = result.filter((r) => re.test(String(r[col] ?? "")))
      return q
    },
    or() {
      return q
    },
    order() {
      return q
    },
    limit(n: number) {
      result = result.slice(0, n)
      return q
    },
    gte(col: string, val: number) {
      result = result.filter((r) => Number(r[col]) >= Number(val))
      return q
    },
    lte(col: string, val: number) {
      result = result.filter((r) => Number(r[col]) <= Number(val))
      return q
    },
    neq(col: string, val: unknown) {
      result = result.filter((r) => r[col] !== val)
      return q
    },
    is(col: string, val: unknown) {
      result = result.filter((r) => (r[col] ?? null) === val)
      return q
    },
    maybeSingle() {
      return Promise.resolve({ data: result[0] ?? null, error: null })
    },
    single() {
      return Promise.resolve({ data: result[0] ?? null, error: null })
    },
    then(resolve: (v: { data: Row[]; error: null }) => unknown) {
      return Promise.resolve({ data: result, error: null }).then(resolve)
    },
  }
  return q
}

/*
 * The public field is cached per weight in production. Here it must not be: these tests set a
 * different fixture per case and then ask the same weight for it, so a real cache would answer
 * the second test with the first test's field.
 */
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: () => {},
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "toc_field_publication_status") return makeQuery(table, state.publication)
      if (table === "toc_invitations") return makeQuery(table, state.invitations)
      if (table === "athletes") return makeQuery(table, state.athletes)
      if (table === "nhsca_placements") return makeQuery(table, state.placements)
      if (table === "fargo_results") return makeQuery(table, state.fargoResults)
      if (table === "matches") return makeQuery(table, state.matches)
      if (table === "wrestling_nchsaa_results") return makeQuery(table, state.stateResults)
      if (table === "toc_coach_designations") return makeQuery(table, state.coachDesignations)
      if (table === "toc_coach_ticket_purchases") return makeQuery(table, state.coachTickets)
      /*
       * The credential engine reconciles across every tournament source, so these tables are now
       * part of this module's real query surface. Empty is the honest default — a test that cares
       * about one of them fills it in. Throwing here instead made the whole bundle fail, which the
       * engine catches as "no credentials", so a broken harness looked exactly like a wrestler
       * with nothing to his name.
       */
      if (SHARED_ENGINE_TABLES.includes(table)) return makeQuery(table, state.engineTables[table] ?? [])
      throw new Error(`unexpected table ${table}`)
    },
  }),
}))

import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import {
  buildAthleteSummary,
  buildCredentials,
  buildFieldRollup,
  normalizeNameForStateMatch,
  formatStateCredential,
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
  state.engineTables = {}
  state.placements = []
  state.fargoResults = []
  state.matches = []
  state.stateResults = []
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
        "accolades",
        "athleteId",
        "club",
        /** Approved corner coaches, each marked paid or not. Deliberately public. */
        "coaches",
        "collegeCommit",
        "credentials",
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
      for (const forbidden of FORBIDDEN_SUMMARY_COLUMNS) {
        expect(columns).not.toContain(forbidden)
      }
    }
  })

  /**
   * The school guarantee moved from the query to the payload, on purpose.
   *
   * It used to be enforced by never selecting `highschool` at all, which is the stronger form —
   * but it was also a fiction: the matcher needs the school to tell two wrestlers with one name
   * apart, and the select that omitted it left every state lookup on this page matching blind.
   * Now the column is read deliberately, into a variable nothing publishes, and the guarantee that
   * matters is asserted where it matters: no school reaches a visitor.
   */
  it("keeps every athlete's school out of the payload even though the matcher reads it", async () => {
    const field = await getPublicAnnouncedWeight(117)
    const serialized = JSON.stringify(field).toLowerCase()
    for (const school of ["davie", "cape fear", "wakefield", "leesville"]) {
      expect(serialized).not.toContain(school)
    }
  })

  it("never selects a ranking of any kind", async () => {
    // The TOC field is not seeded, and a RecruitNC number beside a name reads as one. The column
    // is not queried at all rather than merely left unrendered, so no later change to a card can
    // put it back on a public page by accident.
    await getPublicAnnouncedWeight(117)
    const athleteSelects = state.selects.filter((s) => s.table === "athletes").map((s) => s.columns)
    for (const columns of athleteSelects) {
      expect(columns).not.toContain("prospect_ranking")
      expect(columns).not.toContain("rankings")
      expect(columns).not.toContain("seed")
    }
  })

  it("puts no ranking on any athlete in the payload", async () => {
    const field = await getPublicAnnouncedWeight(117)
    for (const athlete of field?.athletes ?? []) {
      expect(athlete).not.toHaveProperty("recruitNcRank")
      expect(JSON.stringify(athlete)).not.toMatch(/recruitNcRank|prospect_ranking/)
    }
  })

  it("never issues a select(*) against invitations or athletes", async () => {
    /*
     * These two tables are the ones that carry private columns on the same row as public ones —
     * seed, medical notes and jacket size on invitations; GPA, contact details and staff
     * evaluation notes on athletes. Every select against them stays an explicit allowlist.
     *
     * The shared credential engine does select broadly from the tournament tables it reconciles.
     * That is a deliberately narrower guarantee than this file used to make, and it is why the
     * payload-level assertions below exist: nothing those tables hold — school, seed, or anything
     * else — may appear in what a visitor receives.
     */
    await getPublicAnnouncedWeight(117)
    const broad = state.selects.filter(
      (s) => (s.table === "toc_invitations" || s.table === "athletes") && s.columns.includes("*"),
    )
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
    // Within a year, a placing leads a round-of-16 exit. The old order was an artefact of which
    // legacy column happened to be listed first, not a judgement about which result mattered more.
    expect(a?.results).toEqual(["2026 NHSCA 3rd", "2025 NHSCA 5th", "2025 Super 32 Round of 16"])
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

describe("national results", () => {
  beforeEach(() => {
    /*
     * Rows are keyed on the wrestler's name, not on `athlete_id`, because that is how the shared
     * engine finds them — and because 60 of the 106 All-American rows in the real table have no
     * `athlete_id` at all. Fixtures keyed on the ID tested a lookup that did not survive contact
     * with the data.
     */
    state.placements = [
      { athlete_name: "Zeb Wilson", year: 2025, placement: "6th", high_school: "Davie", seed: 2 },
      { athlete_name: "Zeb Wilson", year: 2026, placement: "4th", high_school: "Davie", seed: 1 },
    ]
  })

  it("formats and orders newest first", async () => {
    const field = await getPublicAnnouncedWeight(117)
    const wilson = field?.athletes.find((a) => a.athleteId === "a1")
    expect(wilson?.results).toEqual(["2026 NHSCA 4th", "2025 NHSCA 6th"])
  })

  it("keeps the placements school and seed out of the payload", async () => {
    // Both live on the same row as the placement. The engine reads the row; the page publishes
    // a year and a finish, and nothing else.
    const field = await getPublicAnnouncedWeight(117)
    const serialized = JSON.stringify(field)
    expect(serialized).not.toContain("Davie")
    expect(serialized).not.toMatch(/"seed"/)
  })
})

describe("Fargo All-American results", () => {
  it("counts a linked Fargo All-American in the public rollup", async () => {
    state.fargoResults = [
      { athlete_name: "Zeb Wilson", high_school: "Davie", year: 2026, placement: 5, is_all_american: true },
    ]
    const field = await getPublicAnnouncedWeight(117)
    const athlete = field?.athletes.find((a) => a.athleteId === "a1")
    expect(field?.rollup.allAmericans).toBe(1)
    expect(athlete?.credentials[0]?.detail).toBe("2026 Fargo All-American")
    expect(athlete?.results).toContain("2026 Fargo 5th")
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

describe("state credentials", () => {
  it("names the strongest pill and counts repeats", () => {
    const creds = buildCredentials({
      allAmericanYear: null,
      stateResults: [
        { year: 2026, place: 1, classification: "6A" },
        { year: 2025, place: 1, classification: "3A" },
      ],
    })
    expect(creds.map((c) => c.label)).toEqual(["2x State Champ"])
    expect(creds[0]!.detail).toBe("2026 6A state champion · 2025 3A state champion")
  })

  it("ranks All-American ahead of a state title", () => {
    const creds = buildCredentials({
      allAmericanYear: 2026,
      stateResults: [{ year: 2026, place: 1, classification: "4A" }],
    })
    expect(creds.map((c) => c.kind)).toEqual(["all-american", "state-champion"])
  })

  it("treats a deep placing as a placer", () => {
    expect(
      buildCredentials({ allAmericanYear: null, stateResults: [{ year: 2026, place: 3, classification: "7A" }] })[0]!
        .kind,
    ).toBe("state-placer")
  })

  it("shows nothing for a qualifier, rather than a pill for having entered", () => {
    // Three credentials and no more. "State Qualifier" appeared only on the wrestlers with the
    // least to say, which marks them out rather than flattering them — and everyone in this
    // field qualified.
    expect(
      buildCredentials({ allAmericanYear: null, stateResults: [{ year: 2025, place: null, classification: "3A" }] }),
    ).toEqual([])
  })

  it("drops the qualifier pill when something better exists", () => {
    const creds = buildCredentials({
      allAmericanYear: null,
      stateResults: [
        { year: 2026, place: 1, classification: "6A" },
        { year: 2025, place: null, classification: "3A" },
      ],
    })
    expect(creds.map((c) => c.kind)).toEqual(["state-champion"])
  })

  it("strips generational suffixes so the results table matches the roster", () => {
    expect(normalizeNameForStateMatch("Kristopher Kerr Jr")).toBe("Kristopher Kerr")
    expect(normalizeNameForStateMatch("Bob Smith III")).toBe("Bob Smith")
    expect(normalizeNameForStateMatch("Xavier Bernthal")).toBe("Xavier Bernthal")
  })

  it("labels a runner-up and an ordinal placing", () => {
    expect(formatStateCredential({ year: 2026, place: 2, classification: "6A" })).toBe("2026 6A state runner-up")
    expect(formatStateCredential({ year: 2026, place: 4, classification: "7A" })).toBe("2026 7A state 4th place")
  })
})

describe("field rollup", () => {
  it("counts athletes by credential, not credentials by athlete", () => {
    const athlete = (creds: ReturnType<typeof buildCredentials>, accolades = { stateTitles: 0, stateFinalistFinishes: 0, statePlacements: 0, allAmericanHonors: 0, collegeCommitRecorded: false }) =>
      ({ credentials: creds, accolades, collegeCommit: null }) as unknown as Parameters<typeof buildFieldRollup>[0][number]
    const rollup = buildFieldRollup(
      [
        athlete(buildCredentials({ allAmericanYear: 2026, stateResults: [{ year: 2026, place: 1, classification: "4A" }] }), { stateTitles: 1, stateFinalistFinishes: 1, statePlacements: 1, allAmericanHonors: 1, collegeCommitRecorded: true }),
        athlete(buildCredentials({ allAmericanYear: null, stateResults: [{ year: 2026, place: 3, classification: "7A" }] }), { stateTitles: 0, stateFinalistFinishes: 0, statePlacements: 1, allAmericanHonors: 0, collegeCommitRecorded: false }),
        athlete(buildCredentials({ allAmericanYear: null, stateResults: [] })),
      ],
    )
    expect(rollup).toEqual({ athletes: 3, allAmericans: 1, allAmericanHonors: 1, stateChampions: 1, stateFinalists: 1, statePlacers: 2, statePlacements: 2, stateTitles: 1, collegeCommits: 1 })
  })

  it("sums the same multi-title pills displayed on athlete cards", () => {
    const athlete = (creds: ReturnType<typeof buildCredentials>, accolades: { stateTitles: number; stateFinalistFinishes: number; statePlacements: number; allAmericanHonors: number; collegeCommitRecorded: boolean }) =>
      ({ credentials: creds, accolades, collegeCommit: null }) as unknown as Parameters<typeof buildFieldRollup>[0][number]
    const rollup = buildFieldRollup([
      athlete(buildCredentials({ allAmericanYear: 2026, stateResults: [
        { year: 2025, place: 1, classification: "4A" },
        { year: 2026, place: 1, classification: "8A" },
      ] }), { stateTitles: 2, stateFinalistFinishes: 2, statePlacements: 2, allAmericanHonors: 1, collegeCommitRecorded: false }),
      athlete(buildCredentials({ allAmericanYear: null, stateResults: [
        { year: 2026, place: 1, classification: "6A" },
      ] }), { stateTitles: 1, stateFinalistFinishes: 1, statePlacements: 1, allAmericanHonors: 0, collegeCommitRecorded: false }),
    ])
    expect(rollup.stateTitles).toBe(3)
    expect(rollup.stateChampions).toBe(2)
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
    /** Ten since 184 was dropped on 5 September; the tile list follows TOC_WEIGHT_CLASSES. */
    expect(tiles).toHaveLength(TOC_WEIGHT_CLASSES.length)
    expect(tiles.some((t) => t.weightClass === 184)).toBe(false)

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

describe("normalizeNameForStateMatch — nicknames", () => {
  it("drops a quoted nickname so the legal name matches", () => {
    // State results hold "Amanuel Kahsai"; the roster holds the name people call him.
    expect(normalizeNameForStateMatch('Amanuel "Manny" Kahsai')).toBe("Amanuel Kahsai")
    expect(normalizeNameForStateMatch("Amanuel “Manny” Kahsai")).toBe("Amanuel Kahsai")
    expect(normalizeNameForStateMatch("Amanuel ‘Manny’ Kahsai")).toBe("Amanuel Kahsai")
  })

  it("leaves ordinary names alone", () => {
    expect(normalizeNameForStateMatch("Holt Quincy")).toBe("Holt Quincy")
    expect(normalizeNameForStateMatch("Kristopher Kerr Jr")).toBe("Kristopher Kerr")
  })

  it("leaves apostrophes inside surnames alone", () => {
    expect(normalizeNameForStateMatch("Nick O'Neill")).toBe("Nick O'Neill")
    // Two apostrophes in one name look like a quoted nickname unless the quote must open a token.
    expect(normalizeNameForStateMatch("D'Angelo O'Brien")).toBe("D'Angelo O'Brien")
  })
})

describe("coach credentials on the public field", () => {
  beforeEach(() => {
    state.publication = [{ weight_class: 117, announced_at: "2026-08-16T00:00:00Z" }]
    state.invitations = [{ athlete_id: "a1", weight_class: 117, status: "confirmed", photo_release_accepted: true }]
    state.athletes = [{ id: "a1", name: "Alexander Moody", graduationyear: 2027, wrestlingClub: "Nc Pride" }]
  })

  it("names an approved coach and marks a credential bought under any of that person's aliases", async () => {
    /** The Kostoff case: designated by phone for one wrestler, ticket linked to his account. */
    state.coachDesignations = [
      { athlete_name: "Alexander Moody", coach_name: "John Buck", status: "approved",
        coach_email: null, coach_phone: "9107407806", coach_phone_key: "9107407806", coach_key: "tel:9107407806" },
    ]
    state.coachTickets = [{ email: "ncpridewrestling@gmail.com", linked_coach_key: "tel:9107407806", first_name: null, last_name: null }]
    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes[0].coaches).toEqual([{ name: "John Buck", hasCredential: true }])
  })

  it("marks an approved coach with no credential as unpaid rather than hiding them", async () => {
    state.coachDesignations = [
      { athlete_name: "Alexander Moody", coach_name: "John Buck", status: "approved",
        coach_email: null, coach_phone: "9107407806", coach_phone_key: "9107407806", coach_key: "tel:9107407806" },
    ]
    state.coachTickets = []
    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes[0].coaches).toEqual([{ name: "John Buck", hasCredential: false }])
  })

  it("never names a pending or declined designation", async () => {
    state.coachDesignations = [
      { athlete_name: "Alexander Moody", coach_name: "Pending Coach", status: "pending",
        coach_email: null, coach_phone: "1112223333", coach_phone_key: "1112223333", coach_key: "tel:1112223333" },
      { athlete_name: "Alexander Moody", coach_name: "Declined Coach", status: "declined",
        coach_email: null, coach_phone: "4445556666", coach_phone_key: "4445556666", coach_key: "tel:4445556666" },
    ]
    state.coachTickets = []
    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes[0].coaches).toEqual([])
  })

  it("credits a purchase by the buyer's full name once GoFan collects it", async () => {
    state.coachDesignations = [
      { athlete_name: "Alexander Moody", coach_name: "John Buck", status: "approved",
        coach_email: null, coach_phone: "9107407806", coach_phone_key: "9107407806", coach_key: "tel:9107407806" },
    ]
    /** Bought under a club address, so only the name can place it. */
    state.coachTickets = [{ email: "someclub@example.com", linked_coach_key: null, first_name: "John", last_name: "Buck" }]
    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes[0].coaches).toEqual([{ name: "John Buck", hasCredential: true }])
  })

  it("does not let a first name alone credit a coach", async () => {
    state.coachDesignations = [
      { athlete_name: "Alexander Moody", coach_name: "John Buck", status: "approved",
        coach_email: null, coach_phone: "9107407806", coach_phone_key: "9107407806", coach_key: "tel:9107407806" },
    ]
    state.coachTickets = [{ email: "someclub@example.com", linked_coach_key: null, first_name: "John", last_name: null }]
    const field = await getPublicAnnouncedWeight(117)
    expect(field?.athletes[0].coaches).toEqual([{ name: "John Buck", hasCredential: false }])
  })
})
