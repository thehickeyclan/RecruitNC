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

describe("five stars", () => {
  it("never comes from the formula, however strong the record", () => {
    expect(rateAthlete(ELITE).stars).toBe(4)
    expect(rateAthlete({ ...ELITE, nationallyRanked: true }).stars).toBe(4)
  })

  it("holds a nationally ranked wrestler with no record at four", () => {
    // Devin Hord: ranked #19 nationally as a 2030 freshman. A projection is not a record.
    const rating = rateAthlete({ ...EMPTY, nationallyRanked: true })
    expect(rating.stars).toBe(4)
    expect(rating.provisional).toBe(true)
  })

  it("is reachable by hand", () => {
    expect(applyStarOverride(rateAthlete(ELITE), { stars: 5, reason: "" }).stars).toBe(5)
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

  it("does not dilute a state title for skipping the Tournament of Champions", () => {
    // Matt rated Morrison, Teeter and Hollar - state champions, no TOC result - 4 of 5 in-state.
    expect(instate({ statePlaces: [1] }).points / 33).toBeGreaterThan(0.6)
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
    expect(deep.points).toBeGreaterThan(early.points)
  })

  it("values a main-event place above a qualifier title", () => {
    const nhsca = nationals([{ event: "NHSCA Nationals", year: 2026, placement: 4, record: "6-2" }])
    const earlyEntry = nationals([{ event: "Super 32 Early Entry", year: 2026, placement: 1, record: "3-0" }])
    expect(nhsca.parts?.[0].points).toBeGreaterThan(earlyEntry.parts?.[0].points ?? 0)
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
  it("keeps the top ten at four stars and every other ranked wrestler at three", () => {
    expect(rateAthlete({ ...EMPTY, prospectRanking: 8, rankingPublished: true }).stars).toBe(4)
    expect(rateAthlete({ ...EMPTY, prospectRanking: 15, rankingPublished: true }).stars).toBe(3)
    expect(rateAthlete({ ...EMPTY, prospectRanking: 28, rankingPublished: true }).stars).toBe(3)
  })

  it("holds any NCHSAA placer at two stars", () => {
    expect(rateAthlete({ ...EMPTY, statePlaces: [8] }).stars).toBe(2)
    // A qualifier who did not place is not a placer.
    expect(rateAthlete({ ...EMPTY, statePlaces: [null] }).stars).toBe(1)
  })

  const placer = (extra: Partial<StarRatingInput>) => rateAthlete({ ...EMPTY, statePlaces: [4], ...extra })
  const wins = (n: number) => Array.from({ length: n }, (_, i) => ({ opponent: `W${i}`, reason: "state-placer" as const }))

  const champs = (n: number) => Array.from({ length: n }, (_, i) => ({ opponent: `C${i}`, reason: "state-champion" as const }))

  it("makes a state placer who has beaten three state champions a three", () => {
    expect(placer({ significantWins: champs(3) }).stars).toBe(3)
    expect(placer({ significantWins: champs(2) }).stars).toBe(2)
  })

  it("does not count wins over other placers toward three", () => {
    expect(placer({ significantWins: wins(5) }).stars).toBe(2)
  })

  it("makes a state placer who has beaten a nationally ranked opponent a four", () => {
    const rating = placer({ significantWins: [{ opponent: "N", reason: "national-ranked" }] })
    expect(rating.stars).toBe(4)
    expect(rating.floor).toContain("nationally ranked opponent")
  })

  it("makes a state placer with a winning NHSCA record a three", () => {
    expect(placer({ nationalRows: [{ event: "NHSCA Nationals", year: 2026, placement: null, record: "3-2" }] }).stars).toBe(3)
  })

  it("makes an NHSCA All-American state placer with six significant wins a four", () => {
    const rating = placer({
      significantWins: wins(6),
      nationalRows: [{ event: "NHSCA Nationals", year: 2026, placement: 7, record: "5-3" }],
    })
    expect(rating.stars).toBe(4)
    expect(rating.floor).toContain("All-American")
  })

  it("makes a winning record at Super 32 a four, but not at a qualifier", () => {
    expect(rateAthlete({ ...EMPTY, nationalRows: [{ event: "Super 32", year: 2025, placement: null, record: "3-2" }] }).stars).toBe(4)
    expect(rateAthlete({ ...EMPTY, nationalRows: [{ event: "Super 32 Early Entry", year: 2026, placement: null, record: "3-2" }] }).stars).toBeLessThan(4)
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
  const sept2026 = new Date("2026-09-29T12:00:00")

  it("rates the current seniors and juniors", () => {
    expect(isRatedClass(2027, sept2026)).toBe(true)
    expect(isRatedClass(2028, sept2026)).toBe(true)
  })

  it("does not rate sophomores even when their class ranking is published", () => {
    expect(isRatedClass(2029, sept2026)).toBe(false)
    expect(isRatedClass(2030, sept2026)).toBe(false)
  })

  it("rolls forward with the signing class each July", () => {
    // 2029 is ranked today, so it is the class that becomes rated next summer.
    expect(isRatedClass(2027, new Date("2027-07-15T12:00:00"))).toBe(false)
    expect(isRatedClass(2029, new Date("2027-07-15T12:00:00"))).toBe(true)
  })

  it("does not rate a class that has already graduated", () => {
    expect(isRatedClass(2026, sept2026)).toBe(false)
  })

  it("does not rate an athlete with no class year", () => {
    expect(isRatedClass(null)).toBe(false)
    expect(isRatedClass(undefined)).toBe(false)
    expect(isRatedClass(Number.NaN)).toBe(false)
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
