import { describe, expect, it } from "vitest"
import {
  applyStarOverride,
  isRatedAthlete,
  isRatedClass,
  rateAthlete,
  rankingFloor,
  starsForScore,
  type StarRatingInput,
} from "@/lib/athlete-star-rating"
import { PUBLISHED_PUBLIC_RANKINGS_YEARS } from "@/lib/public-rankings-cap"

const EMPTY: StarRatingInput = {
  nationalRows: [],
  significantWins: [],
  prospectRanking: null,
  rankingPublished: false,
  statePlaces: [],
  nationallyRanked: false,
}

/** The strongest résumé the state can produce, with no national ranking. */
const ELITE: StarRatingInput = {
  nationalRows: [
    { event: "Tournament of Champions", year: 2026, placement: 1, record: "3-0" },
    { event: "Super 32", year: 2026, placement: 1, record: "7-0" },
    { event: "NHSCA Nationals", year: 2026, placement: 2, record: "6-1" },
    { event: "Fargo", year: 2025, placement: 3, record: "7-2" },
  ],
  significantWins: [
    { opponent: "A", reason: "national-ranked" },
    { opponent: "B", reason: "national-ranked" },
    { opponent: "C", reason: "state-champion", stateLabel: "2026 5A State Champion" },
    { opponent: "D", reason: "state-champion", stateLabel: "2026 7A State Champion" },
    { opponent: "E", reason: "state-champion", stateLabel: "2025 4A State Champion" },
    ...Array.from({ length: 8 }, (_, i) => ({ opponent: `P${i}`, reason: "state-placer" as const, stateLabel: "2026 5A State 3rd" })),
  ],
  prospectRanking: 1,
  rankingPublished: true,
  statePlaces: [1, 1],
  nationallyRanked: false,
}

describe("the five-star gate", () => {
  it("caps the best résumé in the state at four without a national ranking", () => {
    const rating = rateAthlete(ELITE)
    expect(rating.stars).toBe(4)
    expect(rating.score).toBeGreaterThan(90)
  })

  it("awards five when an outlet ranks a record that already earns four", () => {
    expect(rateAthlete({ ...ELITE, nationallyRanked: true }).stars).toBe(5)
  })

  it("holds a nationally ranked wrestler with no record at four, not five", () => {
    // Devin Hord: ranked #19 nationally as a 2030 freshman. A projection is not a record.
    const rating = rateAthlete({ ...EMPTY, nationallyRanked: true })
    expect(rating.stars).toBe(4)
    expect(rating.provisional).toBe(true)
  })

  it("never reaches five through the score bands", () => {
    for (let score = 0; score <= 100; score++) expect(starsForScore(score)).toBeLessThanOrEqual(4)
  })
})

describe("rateAthlete components", () => {
  it("is three equal parts that each explain themselves", () => {
    const rating = rateAthlete(ELITE)
    expect(rating.components.map((c) => c.key)).toEqual(["instate", "nationals", "ranking"])
    expect(rating.components.reduce((t, c) => t + c.max, 0)).toBe(100)
    for (const component of rating.components) {
      expect(component.detail.length).toBeGreaterThan(0)
      expect(component.points).toBeLessThanOrEqual(component.max)
      for (const part of component.parts ?? []) expect(part.points).toBeLessThanOrEqual(part.max)
    }
  })

  it("scores an absent record as zero rather than as a penalty", () => {
    const rating = rateAthlete(EMPTY)
    expect(rating.score).toBe(0)
    expect(rating.stars).toBe(1)
  })

  it("ignores an unpublished class ranking", () => {
    const hidden = rateAthlete({ ...ELITE, rankingPublished: false })
    expect(hidden.components.find((c) => c.key === "ranking")?.points).toBe(0)
    expect(hidden.score).toBeLessThan(rateAthlete(ELITE).score)
  })
})

describe("in-state performance", () => {
  const instate = (input: Partial<StarRatingInput>) =>
    rateAthlete({ ...EMPTY, ...input }).components.find((c) => c.key === "instate")!

  it("weighs a Tournament of Champions title above a state title", () => {
    const toc = instate({ nationalRows: [{ event: "Tournament of Champions", year: 2026, placement: 1, record: "3-0" }] })
    const state = instate({ statePlaces: [1] })
    expect(toc.points).toBeGreaterThan(state.points)
  })

  it("does not count the Tournament of Champions as a national event", () => {
    const rating = rateAthlete({
      ...EMPTY,
      nationalRows: [{ event: "Tournament of Champions", year: 2026, placement: 1, record: "3-0" }],
    })
    expect(rating.components.find((c) => c.key === "nationals")?.points).toBe(0)
  })

  it("counts an opponent once however many times he was beaten", () => {
    const once = instate({ significantWins: [{ opponent: "Luke Padgett", reason: "state-champion" }] })
    const twice = instate({
      significantWins: [
        { opponent: "Luke Padgett", reason: "state-champion" },
        { opponent: "luke padgett", reason: "ranked", stateLabel: "2026 5A State Champion" },
      ],
    })
    expect(twice.points).toBe(once.points)
  })
})

describe("nationals", () => {
  const nationals = (rows: StarRatingInput["nationalRows"]) =>
    rateAthlete({ ...EMPTY, nationalRows: rows }).components.find((c) => c.key === "nationals")!

  it("credits a blood-round run without a place", () => {
    // Campbell Tufts: 7-2 at the 2026 NHSCA Nationals, one win from All-American.
    const deep = nationals([{ event: "NHSCA Nationals", year: 2026, placement: null, record: "7-2" }])
    const early = nationals([{ event: "NHSCA Nationals", year: 2026, placement: null, record: "0-2" }])
    expect(deep.parts?.[0].points).toBeGreaterThan(0)
    expect(deep.points).toBeGreaterThan(early.points + 10)
  })

  it("scores the record from the most recent year, not the career", () => {
    const rising = nationals([
      { event: "NHSCA Nationals", year: 2026, placement: null, record: "7-2" },
      { event: "NHSCA Nationals", year: 2024, placement: null, record: "0-2" },
      { event: "NHSCA Nationals", year: 2025, placement: null, record: "1-2" },
    ])
    expect(rising.parts?.[1].detail).toContain("7-2")
  })
})

describe("ranking floors", () => {
  it("keeps the top ten at four stars and the next ten at three", () => {
    expect(rateAthlete({ ...EMPTY, prospectRanking: 8, rankingPublished: true }).stars).toBe(4)
    expect(rateAthlete({ ...EMPTY, prospectRanking: 15, rankingPublished: true }).stars).toBe(3)
    expect(rankingFloor(25, true)).toBe(1)
  })

  it("does not apply to an unpublished class", () => {
    expect(rankingFloor(1, false)).toBe(1)
  })
})

describe("starsForScore bands", () => {
  it("rises monotonically with score", () => {
    let previous = 0
    for (let score = 0; score <= 100; score++) {
      const stars = starsForScore(score)
      expect(stars).toBeGreaterThanOrEqual(previous)
      previous = stars
    }
  })
})

describe("isRatedClass", () => {
  it("rates the classes RecruitNC already ranks", () => {
    expect(isRatedClass(2027)).toBe(true)
    expect(isRatedClass(2028)).toBe(true)
  })

  it("does not rate the younger classes", () => {
    // A freshman's record is thin by definition, and this rating reads thinness as weakness.
    // 2029 joined when its ranking was released; the classes below it are not ranked yet.
    expect(isRatedClass(2030)).toBe(false)
    expect(isRatedClass(2031)).toBe(false)
  })

  it("does not rate a class that has already graduated", () => {
    expect(isRatedClass(2026)).toBe(false)
    expect(isRatedClass(2025)).toBe(false)
  })

  it("does not rate an athlete with no class year", () => {
    expect(isRatedClass(null)).toBe(false)
    expect(isRatedClass(undefined)).toBe(false)
    expect(isRatedClass(Number.NaN)).toBe(false)
  })

  it("tracks the published rankings map rather than a second list", () => {
    // The two must never drift: a class we rank is a class we star, and vice versa.
    for (const year of PUBLISHED_PUBLIC_RANKINGS_YEARS) expect(isRatedClass(year)).toBe(true)
  })
})

describe("applyStarOverride", () => {
  const computed = rateAthlete(ELITE)

  it("replaces the number and keeps what the formula said", () => {
    const out = applyStarOverride(computed, { stars: 2, reason: "Sat out the season injured." })
    expect(out.stars).toBe(2)
    expect(out.override).toMatchObject({ stars: 2, computedStars: computed.stars })
  })

  it("applies an override with no reason", () => {
    // Requiring one meant a star set without a note was written to the row and then ignored on
    // every read, which is indistinguishable from a Save button that does not work.
    expect(applyStarOverride(computed, { stars: 2, reason: "" }).stars).toBe(2)
    expect(applyStarOverride(computed, { stars: 2, reason: "   " }).override).toMatchObject({ stars: 2 })
  })

  it("ignores a rating outside one to five", () => {
    expect(applyStarOverride(computed, { stars: 0, reason: "a real reason here" }).stars).toBe(computed.stars)
    expect(applyStarOverride(computed, { stars: 6, reason: "a real reason here" }).stars).toBe(computed.stars)
  })

  it("does nothing when there is no override", () => {
    expect(applyStarOverride(computed, null).override).toBeUndefined()
    expect(applyStarOverride(computed, { stars: null, reason: null }).stars).toBe(computed.stars)
  })

  it("keeps an override that agrees with today's formula", () => {
    // Pinning a star is the point of setting one by hand. If the bands move next week, a rating
    // somebody chose deliberately should not move with them.
    const out = applyStarOverride(computed, { stars: computed.stars, reason: "looks right to me" })
    expect(out.stars).toBe(computed.stars)
    expect(out.override).toMatchObject({ stars: computed.stars, computedStars: computed.stars })
  })
})

describe("isRatedAthlete", () => {
  it("holds female wrestlers back for now", () => {
    expect(isRatedAthlete({ gender: "Female", graduationYear: 2027 })).toBe(false)
    expect(isRatedAthlete({ gender: "female", graduationYear: 2028 })).toBe(false)
  })

  it("still rates everybody else in a rated class", () => {
    expect(isRatedAthlete({ gender: "Male", graduationYear: 2027 })).toBe(true)
  })

  it("does not widen into athletes with no gender on file", () => {
    expect(isRatedAthlete({ gender: null, graduationYear: 2027 })).toBe(true)
  })

  it("still refuses an unrated class whatever the gender", () => {
    expect(isRatedAthlete({ gender: "Male", graduationYear: 2030 })).toBe(false)
  })
})
