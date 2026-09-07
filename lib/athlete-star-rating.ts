/**
 * The RecruitNC star rating — one glanceable mark, built only from measured results.
 *
 * Football's stars are an analyst's projection of college ceiling. This is not that, and it
 * should never be described as that: it is a weighted read of what a wrestler has actually
 * done, on four axes a coach already asks about.
 *
 *   National      — do they leave North Carolina, and how do they do when they do
 *   Competition   — the quality of who they wrestle week to week in season
 *   Ranking       — where RecruitNC has them in their class
 *   State         — NCHSAA placement, the credential families recognise
 *
 * Every component is traceable to bouts and placements on file, and `StarRating.components`
 * carries the breakdown so the number is always explainable. Show the breakdown wherever the
 * star is shown — an unexplained star on a fifteen-year-old is an argument waiting to happen,
 * and the whole defence of this rating is that it can be walked through line by line.
 *
 * A missing input is scored as absent, never as bad: a wrestler with no national events is
 * not penalised for the events, they simply earn nothing on that axis. Weight goes to what
 * they have done, not to what we lack.
 */

import type { NationalExposure, SeasonStrength } from "@/lib/competition-strength"
import { isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"

export type StarComponent = {
  key: "national" | "competition" | "ranking" | "state"
  label: string
  /** Points earned on this axis. */
  points: number
  /** Points available on this axis. */
  max: number
  /** One line a parent or coach can check against the record. */
  detail: string
}

export type StarRating = {
  /** 1 to 5. Whole stars — half stars imply a precision this does not have. */
  stars: number
  /** 0-100 composite, kept for ordering within a band. */
  score: number
  components: StarComponent[]
  /** True when too little is on file to rate honestly. */
  provisional: boolean
  /** Set when a person overrode the computed rating. Carries what they gave as the reason. */
  override?: { stars: number; computedStars: number; reason: string }
}

export type StarOverride = {
  stars: number | null
  reason: string | null
}

/**
 * A hand-set rating, applied over a computed one.
 *
 * The computed stars are kept alongside rather than discarded, so every surface can say this
 * was a person's call and what they said about it. An override that silently replaced the
 * number would leave the rating looking computed while being a judgement, which is the one
 * thing this rating cannot afford.
 *
 * A reason is required. Without one, the override is ignored — a star nobody can account for
 * is worth less than no star.
 */
export function applyStarOverride(rating: StarRating, override: StarOverride | null): StarRating {
  const stars = override?.stars
  const reason = String(override?.reason ?? "").trim()
  if (stars == null || !Number.isFinite(stars) || stars < 1 || stars > 5 || !reason) return rating
  if (stars === rating.stars) return rating
  return { ...rating, stars, override: { stars, computedStars: rating.stars, reason } }
}

const MAX = { national: 30, competition: 25, ranking: 25, state: 20 } as const

/** Best finish at a national event, scored on how deep the bracket goes. */
function nationalPoints(exposure: NationalExposure): { points: number; detail: string } {
  if (exposure.events === 0) {
    return { points: 0, detail: "No national events on file" }
  }
  let points = Math.min(exposure.events * 3, 12)
  const place = exposure.bestPlacement
  if (place != null) {
    if (place === 1) points += 18
    else if (place <= 4) points += 15
    else if (place <= 8) points += 11
    else points += 5
  } else if (exposure.wins > 0) {
    // Went and won matches without placing — still evidence of a national schedule.
    points += Math.min(exposure.wins * 2, 8)
  }
  const finish =
    place != null && exposure.bestPlacementEvent
      ? `, best ${place === 1 ? "title" : `${place}${ordinalSuffix(place)}`} at ${exposure.bestPlacementEvent}`
      : exposure.wins || exposure.losses
        ? `, ${exposure.wins}-${exposure.losses} nationally`
        : ""
  return {
    points: Math.min(points, MAX.national),
    detail: `${exposure.events} national event${exposure.events === 1 ? "" : "s"}${finish}`,
  }
}

/** Quality of the in-season schedule, and how they fared in the hard part of it. */
function competitionPoints(strength: SeasonStrength): { points: number; detail: string } {
  if (strength.bouts === 0) {
    return { points: 0, detail: "No in-season match data on file" }
  }
  // Half the axis is who they faced, half is how they did against them.
  const share = strength.eliteShare ?? 0
  const facedPoints = Math.min((share / 100) * 14, 14)
  const eliteBouts = strength.eliteWins + strength.eliteLosses
  const eliteWinRate = eliteBouts > 0 ? strength.eliteWins / eliteBouts : 0
  const performedPoints = eliteBouts > 0 ? eliteWinRate * 11 : 0
  const detail =
    eliteBouts > 0
      ? `${strength.eliteWins}-${strength.eliteLosses} vs top-5% opponents (${share}% of schedule)`
      : `${strength.bouts} bouts, none against top-5% opponents`
  return { points: Math.round(facedPoints + performedPoints), detail }
}

/** RecruitNC's own class ranking, when that class is published. */
function rankingPoints(ranking: number | null, published: boolean): { points: number; detail: string } {
  if (!published || ranking == null) {
    return { points: 0, detail: "Not ranked in a published class" }
  }
  let points: number
  if (ranking === 1) points = 25
  else if (ranking <= 3) points = 22
  else if (ranking <= 5) points = 19
  else if (ranking <= 10) points = 15
  else if (ranking <= 20) points = 10
  else points = 6
  return { points, detail: `Ranked #${ranking} in the class` }
}

/** NCHSAA placement — the credential a North Carolina family recognises first. */
function statePoints(places: Array<number | null>): { points: number; detail: string } {
  const placed = places.filter((p): p is number => p != null && p > 0)
  if (placed.length === 0) {
    return { points: 0, detail: "No NCHSAA placement on file" }
  }
  const best = Math.min(...placed)
  const titles = placed.filter((p) => p === 1).length
  let points: number
  if (best === 1) points = 20
  else if (best === 2) points = 16
  else if (best <= 4) points = 13
  else if (best <= 6) points = 9
  else points = 6
  if (titles > 1) points = Math.min(points + 2, MAX.state)
  const detail =
    titles > 0
      ? `${titles}× NCHSAA state champion`
      : `NCHSAA best finish ${best}${ordinalSuffix(best)}`
  return { points, detail }
}

function ordinalSuffix(n: number): string {
  const mod = n % 100
  if (mod >= 11 && mod <= 13) return "th"
  if (n % 10 === 1) return "st"
  if (n % 10 === 2) return "nd"
  if (n % 10 === 3) return "rd"
  return "th"
}

/**
 * Bands for one to four stars, calibrated against the current recruitable pool.
 *
 * Five is not in here. It is not a score at all — see `rateAthlete`.
 */
export function starsForScore(score: number): number {
  if (score >= 68) return 4
  if (score >= 48) return 3
  if (score >= 26) return 2
  return 1
}

export type StarRatingInput = {
  exposure: NationalExposure
  strength: SeasonStrength
  prospectRanking: number | null
  rankingPublished: boolean
  /** NCHSAA finishing places across every year on file. */
  statePlaces: Array<number | null>
  /**
   * Ranked by FloWrestling, Sports Illustrated or MatScouts in a retained edition.
   * The only route to five stars.
   */
  nationallyRanked: boolean
}

/**
 * Whether a wrestler's class is rated at all.
 *
 * Stars run on the classes RecruitNC already publishes rankings for — 2027 and 2028 today.
 * Deliberately read from `PUBLIC_RANKINGS_MAX_BY_YEAR` rather than listed again here, so the
 * two never drift: a class we do not rank is a class we do not know well enough to star, and
 * when a class is added to the rankings the stars follow it without a second edit.
 *
 * The younger classes are the reason. A freshman's record is thin by definition, and a rating
 * built only from results reads that thinness as weakness — Devin Hord, ranked #19 nationally
 * as a Class of 2030 wrestler, scored 14 out of 100. The honest answer for a ninth grader is
 * not one star, it is no star at all.
 */
export function isRatedClass(graduationYear: number | null | undefined): boolean {
  return isPublicRankingsYearPublished(graduationYear)
}

/**
 * Whether an athlete is rated at all.
 *
 * Female wrestlers are held out for now, and the reason is coverage rather than the wrestlers.
 * Backtested across the 2025 and 2026 classes, girls average 3 of 30 on national competition
 * against 8 for boys and 7 of 25 on in-season quality against 11 — while scoring *higher* on
 * state results, which is the one axis where their records are imported as completely. Six of
 * them hold a signed college commitment and score zero.
 *
 * That is a hole in what we have imported, not a read on how they wrestle, and a rating built
 * on it would put one star beside a signed Division II recruit on a page a college coach reads.
 * Better to show nothing than something we know to be wrong. Revisit once girls' national and
 * dual results are imported to the same depth.
 *
 * An athlete with no gender on file is still rated, as before — this holds back a group we can
 * identify, and does not quietly widen into everyone we are unsure about.
 */
export function isRatedAthlete(athlete: {
  gender?: string | null
  graduationYear?: number | null
}): boolean {
  if (!isRatedClass(athlete.graduationYear)) return false
  return String(athlete.gender ?? "").trim().toLowerCase() !== "female"
}

export function rateAthlete(input: StarRatingInput): StarRating {
  const national = nationalPoints(input.exposure)
  const competition = competitionPoints(input.strength)
  const ranking = rankingPoints(input.prospectRanking, input.rankingPublished)
  const state = statePoints(input.statePlaces)

  const components: StarComponent[] = [
    { key: "national", label: "National competition", points: national.points, max: MAX.national, detail: national.detail },
    { key: "competition", label: "Quality of competition", points: competition.points, max: MAX.competition, detail: competition.detail },
    { key: "ranking", label: "Class ranking", points: ranking.points, max: MAX.ranking, detail: ranking.detail },
    { key: "state", label: "State results", points: state.points, max: MAX.state, detail: state.detail },
  ]

  const score = components.reduce((sum, c) => sum + c.points, 0)

  // Rating somebody off almost nothing is how a rating loses its credibility. Say so instead.
  const provisional = input.strength.bouts < 10 && input.exposure.events === 0

  /**
   * Five stars needs a national ranking AND a record that already earns four. Both.
   *
   * The ranking is necessary: no résumé we can assemble earns five on its own, which keeps
   * the top band a fact we point at rather than a judgement we defend.
   *
   * It is emphatically not sufficient, and the first version of this rule only half-enforced
   * that. It refused five to a *provisional* athlete — one with under ten bouts and no
   * national events — and handed it to everybody else who was ranked. Devin Hord, a Class of
   * 2030 freshman ranked #19 nationally, has entered national events and so is not
   * provisional; he scored 14 out of 100, second from bottom of the Tournament of Champions
   * field, and was rated five stars. A national outlet projecting a ninth grader is exactly
   * the projection this rating exists not to launder.
   *
   * So a national ranking floors a wrestler at four — it is a real credential and worth that
   * on its own — but it only reaches five when the record independently earns four. Hord holds
   * at four. Nobody arrives at five on a projection.
   */
  const earned = starsForScore(score)
  const stars = input.nationallyRanked ? Math.max(earned === 4 ? 5 : 4, earned) : earned

  return { stars, score, components, provisional }
}
