import { describe, expect, it } from "vitest"
import {
  applyStarOverride,
  isRatedAthlete,
  isRatedClass,
  rateAthlete,
  starsForScore,
  type StarRatingInput,
} from "@/lib/athlete-star-rating"
import { PUBLISHED_PUBLIC_RANKINGS_YEARS } from "@/lib/public-rankings-cap"
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

describe("five stars needs the record, not only the ranking", () => {
  /**
   * The gate this pins down failed in production data, not in a fixture.
   *
   * The first version refused five only to a *provisional* athlete — under ten bouts and no
   * national events — and gave it to every other ranked wrestler. Devin Hord had entered
   * national events, so he was not provisional, and was rated five stars on a score of 14 out
   * of 100: second from bottom of the entire Tournament of Champions field.
   */
  const thinButNotProvisional: StarRatingInput = {
    exposure: { events: 2, latestYear: 2026, wins: 1, losses: 4, bestPlacement: null, bestPlacementEvent: null, rows: [] },
    strength: noSeason,
    prospectRanking: null,
    rankingPublished: false,
    statePlaces: [],
    nationallyRanked: true,
  }

  it("holds a ranked wrestler with a weak record at four even when not provisional", () => {
    const rating = rateAthlete(thinButNotProvisional)
    expect(rating.provisional).toBe(false)
    expect(rating.score).toBeLessThan(30)
    expect(rating.stars).toBe(4)
  })

  it("reaches five only when the record alone is already worth four", () => {
    expect(starsForScore(rateAthlete(ELITE).score)).toBe(4)
    expect(rateAthlete({ ...ELITE, nationallyRanked: true }).stars).toBe(5)
  })

  it("never gives five to an unranked wrestler, however strong the record", () => {
    expect(rateAthlete({ ...ELITE, nationallyRanked: false }).stars).toBe(4)
  })
})

describe("isRatedClass", () => {
  it("rates the classes RecruitNC already ranks", () => {
    expect(isRatedClass(2027)).toBe(true)
    expect(isRatedClass(2028)).toBe(true)
  })

  it("does not rate the younger classes", () => {
    // A freshman's record is thin by definition, and this rating reads thinness as weakness.
    expect(isRatedClass(2029)).toBe(false)
    expect(isRatedClass(2030)).toBe(false)
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

  it("refuses an override with no reason", () => {
    // A star nobody can account for is worth less than no star.
    expect(applyStarOverride(computed, { stars: 2, reason: "" }).stars).toBe(computed.stars)
    expect(applyStarOverride(computed, { stars: 2, reason: "   " }).override).toBeUndefined()
  })

  it("ignores a rating outside one to five", () => {
    expect(applyStarOverride(computed, { stars: 0, reason: "a real reason here" }).stars).toBe(computed.stars)
    expect(applyStarOverride(computed, { stars: 6, reason: "a real reason here" }).stars).toBe(computed.stars)
  })

  it("does nothing when there is no override", () => {
    expect(applyStarOverride(computed, null).override).toBeUndefined()
    expect(applyStarOverride(computed, { stars: null, reason: null }).stars).toBe(computed.stars)
  })

  it("does not mark an override that agrees with the formula", () => {
    // Setting the same number by hand is not a disagreement and should not read as one.
    expect(applyStarOverride(computed, { stars: computed.stars, reason: "looks right to me" }).override).toBeUndefined()
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
