import { describe, expect, it } from "vitest"
import { formatSingleSeasonWinsBlurb, formatTiedRank } from "@/lib/historical-wins/display"
import {
  enrichSingleSeasonWinningestRows,
  parseMinWinsFromQuery,
  parseSeasonFromQuery,
} from "@/lib/historical-wins/data-dawg"
import {
  filterSingleSeasonRows,
  matchHistoricalAthlete,
  nameNeedsReview,
  normalizeHistoricalName,
  schoolsExactMatch,
} from "@/lib/historical-wins/match"
import {
  historicalWinsDatasetLooseSchema,
  historicalWinsRecordSchema,
  parseSeasonYears,
} from "@/lib/historical-wins/schema"
import { shouldLinkWinningestAthlete } from "@/lib/historical-wins/public"
import { HISTORICAL_WINS_EXPECTED_COUNT } from "@/lib/historical-wins/constants"

const checkpoints = [
  {
    id: "most-wins-season-0001-colton-palmer-2006",
    rank: 1,
    tie: false,
    name: "Colton Palmer",
    school: "Riverside-Durham",
    record: "91-0",
    wins: 91,
    losses: 0,
    season: "2006-2007",
    source: { title: "NCHSAA Wrestling Most Victories (Season-All Time)", dataset: "most_victories_single_season", version: 1 },
  },
  {
    id: "most-wins-season-vincent-ramirez",
    rank: 9,
    tie: true,
    name: "Vincent Ramirez",
    school: "Riverside-Durham",
    record: "74-0",
    wins: 74,
    losses: 0,
    season: "2003-2004",
    source: { title: "NCHSAA Wrestling Most Victories (Season-All Time)", dataset: "most_victories_single_season", version: 1 },
  },
  {
    id: "most-wins-season-justin-sparrow",
    rank: 154,
    tie: true,
    name: "Justin Sparrow",
    school: "East Gaston",
    record: "60-0",
    wins: 60,
    losses: 0,
    season: "2004-2005",
    source: { title: "NCHSAA Wrestling Most Victories (Season-All Time)", dataset: "most_victories_single_season", version: 1 },
  },
  {
    id: "most-wins-season-jacob-creed",
    rank: 188,
    tie: true,
    name: "Jacob Creed",
    school: "Ragsdale",
    record: "59-0",
    wins: 59,
    losses: 0,
    season: "2005-2006",
    source: { title: "NCHSAA Wrestling Most Victories (Season-All Time)", dataset: "most_victories_single_season", version: 1 },
  },
  {
    id: "most-wins-season-kacee-hutchinson",
    rank: 230,
    tie: true,
    name: "Kacee Hutchinson",
    school: "Enka",
    record: "58-0",
    wins: 58,
    losses: 0,
    season: "2012-2013",
    source: { title: "NCHSAA Wrestling Most Victories (Season-All Time)", dataset: "most_victories_single_season", version: 1 },
  },
  {
    id: "most-wins-season-marciano-ali",
    rank: 283,
    tie: true,
    name: "Marciano Ali",
    school: "Parkland",
    record: "57-0",
    wins: 57,
    losses: 0,
    season: "2009-2010",
    source: { title: "NCHSAA Wrestling Most Victories (Season-All Time)", dataset: "most_victories_single_season", version: 1 },
  },
  {
    id: "most-wins-season-raymond-jordan",
    rank: 357,
    tie: true,
    name: "Raymond Jordan",
    school: "New Bern",
    record: "56-0",
    wins: 56,
    losses: 0,
    season: "2003-2004",
    source: { title: "NCHSAA Wrestling Most Victories (Season-All Time)", dataset: "most_victories_single_season", version: 1 },
  },
  {
    id: "most-wins-season-drew-forshey",
    rank: 426,
    tie: true,
    name: "Drew Forshey",
    school: "St. Stephens",
    record: "55-0",
    wins: 55,
    losses: 0,
    season: "2000-2001",
    source: { title: "NCHSAA Wrestling Most Victories (Season-All Time)", dataset: "most_victories_single_season", version: 1 },
  },
] as const

describe("historical wins schema", () => {
  it("parses valid season years", () => {
    expect(parseSeasonYears("2006-2007")).toEqual({ start: 2006, end: 2007 })
  })

  it("rejects malformed seasons", () => {
    expect(() => parseSeasonYears("2006")).toThrow()
    expect(() => parseSeasonYears("2006-2008")).toThrow()
  })

  it("rejects record/wins/losses mismatch", () => {
    const bad = {
      ...checkpoints[0],
      record: "90-0",
    }
    const r = historicalWinsRecordSchema.safeParse(bad)
    expect(r.success).toBe(false)
  })

  it("rejects duplicate source record ids", () => {
    const doc = {
      schema_version: "1.0",
      dataset: "nc_wrestling_most_victories_single_season",
      title: "Test",
      record_count: 2,
      records: [checkpoints[0], { ...checkpoints[0], wins: 90, losses: 1, record: "90-1" }],
    }
    const r = historicalWinsDatasetLooseSchema.safeParse(doc)
    expect(r.success).toBe(false)
  })

  it("accepts all checkpoint records", () => {
    for (const c of checkpoints) {
      const r = historicalWinsRecordSchema.safeParse(c)
      expect(r.success, c.name).toBe(true)
    }
  })

  it("expects 521 for full import schema constant", () => {
    expect(HISTORICAL_WINS_EXPECTED_COUNT).toBe(521)
  })
})

describe("tie rank display", () => {
  it("formats ties as T9 / T154", () => {
    expect(formatTiedRank(1, false)).toBe("1")
    expect(formatTiedRank(9, true)).toBe("T9")
    expect(formatTiedRank(154, true)).toBe("T154")
    expect(formatTiedRank(426, true)).toBe("T426")
  })
})

describe("conservative matching", () => {
  it("auto-matches exact name + school + compatible years", () => {
    const m = matchHistoricalAthlete({
      sourceName: "Colton Palmer",
      sourceSchool: "Riverside-Durham",
      seasonEndYear: 2007,
      athleteCandidates: [
        {
          id: "uuid-colton",
          name: "Colton Palmer",
          highschool: "Riverside-Durham",
          graduationyear: 2007,
        },
      ],
      schoolCandidates: [{ id: "sch-1", name: "Riverside-Durham" }],
    })
    expect(m.match_status).toBe("matched")
    expect(m.athlete_id).toBe("uuid-colton")
  })

  it("needs review when name matches but school differs", () => {
    const m = matchHistoricalAthlete({
      sourceName: "Colton Palmer",
      sourceSchool: "Riverside-Durham",
      seasonEndYear: 2007,
      athleteCandidates: [
        {
          id: "uuid-colton",
          name: "Colton Palmer",
          highschool: "Some Other HS",
          graduationyear: 2007,
        },
      ],
      schoolCandidates: [],
    })
    expect(m.match_status).toBe("needs_review")
    expect(m.athlete_id).toBeNull()
    expect(m.proposed_athlete_id).toBe("uuid-colton")
  })

  it("unmatched when no athlete candidate", () => {
    const m = matchHistoricalAthlete({
      sourceName: "Nobody Here",
      sourceSchool: "Nowhere",
      seasonEndYear: 2007,
      athleteCandidates: [],
      schoolCandidates: [],
    })
    expect(m.match_status).toBe("unmatched")
    expect(m.athlete_id).toBeNull()
  })

  it("flags nickname / abbreviated names for review", () => {
    expect(nameNeedsReview('Billy "Austin" Benfield')).toBe(true)
    expect(nameNeedsReview("B.J. Murray")).toBe(true)
    expect(nameNeedsReview("Colton Palmer")).toBe(false)
  })

  it("normalizes school punctuation", () => {
    expect(schoolsExactMatch("C.B. Aycock", "CB Aycock")).toBe(true)
    expect(normalizeHistoricalName("Parker VonEgidy")).toBe("parker vonegidy")
  })
})

describe("filters and Data Dawg enrichment", () => {
  const rows = checkpoints.map((c) => ({
    wrestler_name: c.name,
    school: c.school,
    wins: c.wins,
    losses: c.losses,
    year: c.season,
    rank_numeric: c.rank,
    is_tied: c.tie,
    record: c.record,
  }))

  it("filters by school and season and min wins", () => {
    expect(filterSingleSeasonRows(rows, { schoolQuery: "Riverside" })).toHaveLength(2)
    expect(filterSingleSeasonRows(rows, { season: "2003-2004" })).toHaveLength(2)
    expect(filterSingleSeasonRows(rows, { minWins: 60 })).toHaveLength(3)
  })

  it("parses min wins and season from queries", () => {
    expect(parseMinWinsFromQuery("show wrestlers with 60 or more wins")).toBe(60)
    expect(parseMinWinsFromQuery("at least 55 wins")).toBe(55)
    expect(parseSeasonFromQuery("2019-2020 season with 60 wins")).toBe("2019-2020")
  })

  it("builds context blurbs for Data Dawg", () => {
    const enriched = enrichSingleSeasonWinningestRows([
      {
        wrestler_name: "Colton Palmer",
        school: "Riverside-Durham",
        wins: 91,
        losses: 0,
        year: "2006-2007",
        rank_numeric: 1,
        is_tied: false,
      },
    ])
    expect(enriched[0].context).toContain("Colton Palmer of Riverside-Durham")
    expect(enriched[0].context).toContain("91 wins")
    expect(String(enriched[0].context)).toContain("ranks 1")
  })

  it("formatSingleSeasonWinsBlurb matches checkpoint language", () => {
    const blurb = formatSingleSeasonWinsBlurb({
      wrestler_name: "Vincent Ramirez",
      school: "Riverside-Durham",
      wins: 74,
      losses: 0,
      year: "2003-2004",
      rank_numeric: 9,
      is_tied: true,
    })
    expect(blurb).toContain("T9")
    expect(blurb).toContain("74 wins")
  })

  it("only links confirmed matches", () => {
    expect(
      shouldLinkWinningestAthlete({ athlete_id: "x", match_status: "matched" }),
    ).toBe(true)
    expect(
      shouldLinkWinningestAthlete({ athlete_id: "x", match_status: "needs_review" }),
    ).toBe(false)
    expect(shouldLinkWinningestAthlete({ athlete_id: null, match_status: "matched" })).toBe(false)
  })
})

describe("idempotent upsert key shape", () => {
  it("checkpoint source ids are unique", () => {
    const ids = checkpoints.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
