import { describe, expect, it } from "vitest"
import { rateAthlete, starsForScore, type StarRatingInput } from "@/lib/athlete-star-rating"
import type { NationalExposure, SeasonStrength } from "@/lib/competition-strength"

const noExposure: NationalExposure = {
  events: 0,
  latestYear: null,
  wins: 0,
  losses: 0,
  bestPlacement: null,
  bestPlacementEvent: null,
  rows: [],
}

const noSeason: SeasonStrength = {
  bouts: 0,
  wins: 0,
  losses: 0,
  averageOpponentPercentile: null,
  vsElite: 0,
  eliteWins: 0,
  eliteLosses: 0,
  bonusRate: null,
  eliteShare: null,
}

/** The strongest résumé the state can produce, with no national ranking. */
const ELITE: StarRatingInput = {
  exposure: {
    ...noExposure,
    events: 4,
    wins: 18,
    losses: 3,
    bestPlacement: 1,
    bestPlacementEvent: "Super 32",
    latestYear: 2026,
  },
  strength: {
    ...noSeason,
    bouts: 45,
    wins: 43,
    losses: 2,
    averageOpponentPercentile: 92,
    vsElite: 30,
    eliteWins: 28,
    eliteLosses: 2,
    bonusRate: 70,
    eliteShare: 66,
  },
  prospectRanking: 1,
  rankingPublished: true,
  statePlaces: [1, 1],
  nationallyRanked: false,
}

describe("the five-star gate", () => {
  it("caps the best résumé in the state at four without a national ranking", () => {
    const rating = rateAthlete(ELITE)
    expect(rating.stars).toBe(4)
    // Not a near miss on points — the score is near the ceiling and still capped.
    expect(rating.score).toBeGreaterThan(80)
  })

  it("awards five as soon as an outlet ranks them", () => {
    expect(rateAthlete({ ...ELITE, nationallyRanked: true }).stars).toBe(5)
  })

  it("holds a ranked wrestler with no record at four, not five", () => {
    // Devin Hord: ranked #19 nationally as a Class of 2030 freshman with nothing on file.
    // A national outlet projecting a ninth grader is not a record, and five stars needs one.
    const thin: StarRatingInput = {
      exposure: noExposure,
      strength: noSeason,
      prospectRanking: null,
      rankingPublished: false,
      statePlaces: [],
      nationallyRanked: true,
    }
    const rating = rateAthlete(thin)
    expect(rating.stars).toBe(4)
    expect(rating.provisional).toBe(true)
  })

  it("does not drop a ranked wrestler below four just because the record is thin", () => {
    // The ranking is still a real credential; it floors them at four rather than scoring them.
    expect(
      rateAthlete({
        exposure: noExposure,
        strength: { ...noSeason, bouts: 3, wins: 1, losses: 2 },
        prospectRanking: null,
        rankingPublished: false,
        statePlaces: [],
        nationallyRanked: true,
      }).stars,
    ).toBe(4)
  })

  it("never reaches five through the score bands", () => {
    for (let score = 0; score <= 100; score++) {
      expect(starsForScore(score)).toBeLessThanOrEqual(4)
    }
  })
})

describe("rateAthlete components", () => {
  it("explains every axis so the star can be walked through", () => {
    const rating = rateAthlete(ELITE)
    expect(rating.components.map((c) => c.key)).toEqual([
      "national",
      "competition",
      "ranking",
      "state",
    ])
    for (const component of rating.components) {
      expect(component.detail.length).toBeGreaterThan(0)
      expect(component.points).toBeLessThanOrEqual(component.max)
    }
  })

  it("scores an absent axis as zero rather than as a penalty", () => {
    const rating = rateAthlete({
      exposure: noExposure,
      strength: noSeason,
      prospectRanking: null,
      rankingPublished: false,
      statePlaces: [],
      nationallyRanked: false,
    })
    expect(rating.score).toBe(0)
    expect(rating.stars).toBe(1)
    expect(rating.components.every((c) => c.points === 0)).toBe(true)
  })

  it("ignores an unpublished class ranking", () => {
    // Showing a number from a class we have not published would leak it.
    const withHidden = rateAthlete({ ...ELITE, rankingPublished: false })
    const withShown = rateAthlete(ELITE)
    expect(withHidden.score).toBeLessThan(withShown.score)
    expect(withHidden.components.find((c) => c.key === "ranking")?.points).toBe(0)
  })

  it("flags a rating built on almost nothing as provisional", () => {
    const thin = rateAthlete({
      exposure: noExposure,
      strength: { ...noSeason, bouts: 4, wins: 4 },
      prospectRanking: null,
      rankingPublished: false,
      statePlaces: [],
      nationallyRanked: false,
    })
    expect(thin.provisional).toBe(true)
    expect(rateAthlete(ELITE).provisional).toBe(false)
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
