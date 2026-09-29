/**
 * The RecruitNC star rating — one glanceable mark, built only from measured results.
 *
 * Football's stars are an analyst's projection of college ceiling. This is not that, and it
 * should never be described as that: it is a weighted read of what a wrestler has actually
 * done, in three equal parts a coach already asks about.
 *
 *   In-state      — Tournament of Champions, then significant wins, then NCHSAA States
 *   Nationals     — placement (or how deep the run went), recent record, events entered
 *   Ranking       — where RecruitNC has them in their class
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

import type { NationalEventRow } from "@/lib/competition-strength"
import type { SignificantWin } from "@/lib/significant-wins"
import { isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"

export type StarPart = {
  label: string
  points: number
  max: number
  detail: string
}

export type StarComponent = {
  key: "instate" | "nationals" | "ranking"
  label: string
  /** Points earned on this axis. */
  points: number
  /** Points available on this axis. */
  max: number
  /** One line a parent or coach can check against the record. */
  detail: string
  /** What the component is made of, each line traceable to a result on file. */
  parts?: StarPart[]
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
/**
 * A hand-set rating wins, reason or no reason.
 *
 * This used to discard any override that arrived without one, so a star set without a note was
 * written to the row and then silently ignored everywhere it was read — the rating simply did
 * not change, which reads exactly like a broken Save button. A reason is worth having and is
 * still stored and shown; it is no longer the price of setting a star.
 *
 * An override equal to the computed value is also kept rather than dropped. Pinning a star is
 * the point of setting one by hand: if the formula moves next week, a rating somebody chose
 * should not move with it.
 */
export function applyStarOverride(rating: StarRating, override: StarOverride | null): StarRating {
  const stars = override?.stars
  const reason = String(override?.reason ?? "").trim()
  if (stars == null || !Number.isFinite(stars) || stars < 1 || stars > 5) return rating
  return { ...rating, stars, override: { stars, computedStars: rating.stars, reason } }
}

/**
 * Three equal parts, a third of the score each.
 *
 * Matt, 29 September 2026: in-state performance, nationals and the ranking, weighted alike, and
 * within in-state the Tournament of Champions above significant wins above NCHSAA States. A
 * fourth part for consistency was tried and dropped: every wrestler with two or more national
 * events already scored full marks on it, and the ones it marked down had no season on file
 * because we never imported their school, not because they sat out.
 */
const MAX = { instate: 33, nationals: 33, ranking: 34 } as const
const PART_MAX = { toc: 15, wins: 10, state: 8, depth: 16, record: 10, participation: 7 } as const

const TOURNAMENT_OF_CHAMPIONS = /tournament of champions|\btoc\b/i
/** Brackets deep enough that six wins without a place is a blood-round run. */
const DEEP_BRACKET = /^(NHSCA Nationals|Super 32|Fargo)$/i

function parseRecord(record: string | null | undefined): { wins: number; losses: number } {
  const m = String(record ?? "").match(/(\d+)\s*-\s*(\d+)/)
  return m ? { wins: Number(m[1]), losses: Number(m[2]) } : { wins: 0, losses: 0 }
}

function bestPlace(places: ReadonlyArray<number | null | undefined>): number | null {
  const placed = places.filter((p): p is number => p != null && p > 0)
  return placed.length ? Math.min(...placed) : null
}

function placeWord(place: number): string {
  return place === 1 ? "title" : `${place}${ordinalSuffix(place)}`
}

/** Tournament of Champions: the strongest in-state credential, because every classification enters it. */
function tocPart(rows: readonly NationalEventRow[]): StarPart {
  const max = PART_MAX.toc
  if (!rows.length) return { label: "Tournament of Champions", points: 0, max, detail: "Not entered" }
  const place = bestPlace(rows.map((r) => r.placement))
  const points = place === 1 ? 15 : place === 2 ? 12 : place != null && place <= 4 ? 10 : place != null ? 7 : 4
  const year = rows.find((r) => r.placement === place)?.year ?? rows[0].year
  return {
    label: "Tournament of Champions",
    points,
    max,
    detail: place != null ? `${year} ${place === 1 ? "champion" : placeWord(place)}` : `Entered ${rows.map((r) => r.year).join(", ")}`,
  }
}

/**
 * Significant wins, one count per opponent however many times he was beaten, weighted by the
 * opponent's standing. Counting bouts rewarded wrestling the same good opponent four times.
 */
function winsPart(wins: StarRatingInput["significantWins"]): StarPart {
  const best = new Map<string, "national" | "champion" | "other">()
  const rank = { national: 0, champion: 1, other: 2 } as const
  for (const w of wins) {
    const kind =
      w.reason === "national-ranked"
        ? "national"
        : w.reason === "state-champion" || /champion/i.test(w.stateLabel ?? "")
          ? "champion"
          : "other"
    const key = w.opponent.trim().toLowerCase()
    const seen = best.get(key)
    if (!seen || rank[kind] < rank[seen]) best.set(key, kind)
  }
  const count = { national: 0, champion: 0, other: 0 }
  for (const kind of best.values()) count[kind] += 1
  const points = Math.round(
    Math.min(count.national * 2, 4) + Math.min(count.champion * 1.5, 4) + Math.min(count.other * 0.25, 2),
  )
  const bits = [
    count.national ? `${count.national} nationally ranked` : "",
    count.champion ? `${count.champion} state champion${count.champion === 1 ? "" : "s"}` : "",
    count.other ? `${count.other} other ranked or placer` : "",
  ].filter(Boolean)
  return {
    label: "Significant wins",
    points,
    max: PART_MAX.wins,
    detail: bits.length ? `Opponents beaten: ${bits.join(", ")}` : "None on file",
  }
}

/** NCHSAA placement. A qualifier with no place still wrestled at States. */
function statePart(places: ReadonlyArray<number | null>): StarPart {
  const max = PART_MAX.state
  const best = bestPlace(places)
  const titles = places.filter((p) => p === 1).length
  if (best == null) {
    return places.length
      ? { label: "NCHSAA States", points: 1, max, detail: "State qualifier" }
      : { label: "NCHSAA States", points: 0, max, detail: "No NCHSAA result on file" }
  }
  const points = best === 1 ? 8 : best === 2 ? 7 : best <= 4 ? 5 : best <= 6 ? 4 : 3
  return {
    label: "NCHSAA States",
    points,
    max,
    detail: titles > 0 ? `${titles}\u00d7 state champion` : `Best finish ${best}${ordinalSuffix(best)}`,
  }
}

/**
 * How far a wrestler got at a national event. A place counts most; a deep run without one still
 * counts. Campbell Tufts went 7-2 at the 2026 NHSCA Nationals and lost in the blood round, one
 * win from All-American, and the first version scored that the same as going 0-2.
 */
function depthPart(rows: readonly NationalEventRow[]): StarPart {
  const max = PART_MAX.depth
  const place = bestPlace(rows.map((r) => r.placement))
  if (place != null && place <= 8) {
    const row = rows.find((r) => r.placement === place)!
    const points = place === 1 ? 16 : place <= 4 ? 13 : 10
    return { label: "National placement", points, max, detail: `${placeWord(place)} at ${row.year} ${row.event}` }
  }
  const deepest = rows
    .filter((r) => DEEP_BRACKET.test(r.event))
    .map((r) => ({ row: r, wins: parseRecord(r.record).wins }))
    .sort((a, b) => b.wins - a.wins)[0]
  if (deepest && deepest.wins >= 4) {
    const record = deepest.row.record ?? `${deepest.wins} wins`
    return {
      label: "National placement",
      points: deepest.wins >= 6 ? 6 : 3,
      max,
      detail: `${record} at ${deepest.row.year} ${deepest.row.event}, no place${deepest.wins >= 6 ? " (blood round or deeper)" : ""}`,
    }
  }
  return { label: "National placement", points: 0, max, detail: rows.length ? "No place or deep run" : "No national events on file" }
}

/**
 * Record at national events in the most recent year he entered any. A freshman 0-2 should not
 * cancel a junior 7-2: pooling a career did exactly that, and read a rising wrestler as a .500 one.
 */
function recordPart(rows: readonly NationalEventRow[]): StarPart {
  const max = PART_MAX.record
  if (!rows.length) return { label: "National record", points: 0, max, detail: "No national events on file" }
  const latest = Math.max(...rows.map((r) => r.year))
  const { wins, losses } = rows
    .filter((r) => r.year === latest)
    .reduce((t, r) => {
      const x = parseRecord(r.record)
      return { wins: t.wins + x.wins, losses: t.losses + x.losses }
    }, { wins: 0, losses: 0 })
  if (wins + losses < 3) {
    return { label: "National record", points: 0, max, detail: `${wins}-${losses} in ${latest}, too few bouts to score` }
  }
  return {
    label: "National record",
    points: Math.round((wins / (wins + losses)) * max),
    max,
    detail: `${wins}-${losses} at national events in ${latest}`,
  }
}

function participationPart(rows: readonly NationalEventRow[]): StarPart {
  return {
    label: "National events entered",
    points: Math.round(Math.min(rows.length * 1.5, PART_MAX.participation)),
    max: PART_MAX.participation,
    detail: `${rows.length} national event${rows.length === 1 ? "" : "s"}`,
  }
}

/** RecruitNC's own class ranking, when that class is published. */
function rankingPoints(ranking: number | null, published: boolean): { points: number; detail: string } {
  if (!published || ranking == null) {
    return { points: 0, detail: "Not in a published RecruitNC class ranking" }
  }
  const points = ranking === 1 ? 34 : ranking <= 3 ? 30 : ranking <= 5 ? 26 : ranking <= 10 ? 21 : ranking <= 20 ? 14 : 8
  return { points, detail: `RecruitNC #${ranking} in the class` }
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
 * Bands for one to four stars, calibrated against the 2027 and 2028 classes so the spread of
 * stars stays close to what it was before the formula changed.
 *
 * Five is not in here. It is not a score at all — see `rateAthlete`.
 */
export function starsForScore(score: number): number {
  if (score >= STAR_BANDS[0]) return 4
  if (score >= STAR_BANDS[1]) return 3
  if (score >= STAR_BANDS[2]) return 2
  return 1
}
const STAR_BANDS = [52, 32, 14] as const

/**
 * The fewest stars a published class ranking allows. Without it a wrestler ranked inside the top
 * ten could show three stars beside a lower-ranked four, and a coach reads that as an error.
 */
export function rankingFloor(ranking: number | null, published: boolean): number {
  if (!published || ranking == null) return 1
  if (ranking <= 10) return 4
  if (ranking <= 20) return 3
  return 1
}

export type StarRatingInput = {
  /** Every national event row, the Tournament of Champions included; the rating separates it. */
  nationalRows: readonly NationalEventRow[]
  /** Accolade wins as the scouting report and profile show them (`withAccoladesOnly`). */
  significantWins: ReadonlyArray<Pick<SignificantWin, "opponent" | "reason" | "stateLabel">>
  prospectRanking: number | null
  rankingPublished: boolean
  /** NCHSAA finishing places across every year on file; null for a qualifier who did not place. */
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
  const tocRows = input.nationalRows.filter((r) => TOURNAMENT_OF_CHAMPIONS.test(r.event))
  const nationalRows = input.nationalRows.filter((r) => !TOURNAMENT_OF_CHAMPIONS.test(r.event))

  const instateParts = [tocPart(tocRows), winsPart(input.significantWins), statePart(input.statePlaces)]
  const nationalParts = [depthPart(nationalRows), recordPart(nationalRows), participationPart(nationalRows)]
  const ranking = rankingPoints(input.prospectRanking, input.rankingPublished)
  const sum = (parts: StarPart[]) => parts.reduce((t, p) => t + p.points, 0)

  const components: StarComponent[] = [
    {
      key: "instate",
      label: "In-state performance",
      points: sum(instateParts),
      max: MAX.instate,
      detail: instateParts.map((p) => p.detail).join(" · "),
      parts: instateParts,
    },
    {
      key: "nationals",
      label: "Nationals",
      points: sum(nationalParts),
      max: MAX.nationals,
      detail: nationalParts.map((p) => p.detail).join(" · "),
      parts: nationalParts,
    },
    { key: "ranking", label: "Class ranking", points: ranking.points, max: MAX.ranking, detail: ranking.detail },
  ]

  const score = components.reduce((total, c) => total + c.points, 0)

  // Rating somebody off almost nothing is how a rating loses its credibility. Say so instead.
  const provisional =
    input.nationalRows.length === 0 && input.statePlaces.length === 0 && input.significantWins.length === 0

  /**
   * Five stars needs a national ranking AND a record that already earns four. Both.
   *
   * A national ranking floors a wrestler at four - it is a real credential - but only reaches five
   * when the record independently earns four. Devin Hord, a 2030 freshman ranked #19 nationally,
   * scored 14 of 100 and was once rated five; nobody arrives at five on a projection.
   *
   * The ranking floor applies after, and never lifts anyone to five.
   */
  const earned = starsForScore(score)
  const withNational = input.nationallyRanked ? Math.max(earned === 4 ? 5 : 4, earned) : earned
  const stars = Math.max(withNational, rankingFloor(input.prospectRanking, input.rankingPublished))

  return { stars, score, components, provisional }
}
