/**
 * The RecruitNC star rating — one glanceable mark, built only from measured results.
 *
 * Football's stars are an analyst's projection of college ceiling. This is not that, and it
 * should never be described as that: it is a weighted read of what a wrestler has actually
 * done, in three equal parts a coach already asks about.
 *
 *   In-state      — best finish (Tournament of Champions above NCHSAA), plus significant wins
 *   Nationals     — NHSCA/Super 32/Fargo placement or deep run, recent record, events entered
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
import { getCurrentSigningClass } from "@/lib/commit-class-year"
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
  /** When a credential, not the score, set the stars: "Held at 4: winning record at Super 32". */
  floor?: string
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
const PART_MAX = { finish: 27, wins: 6, depth: 20, record: 8, participation: 5 } as const

const TOURNAMENT_OF_CHAMPIONS = /tournament of champions|\btoc\b/i
/** The three national events whose brackets make a place, or a deep run, a real credential. */
const MAIN_EVENT = /^(NHSCA Nationals|Super 32|Fargo)$/i

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

/**
 * The best in-state finish, Tournament of Champions or NCHSAA, whichever is stronger.
 *
 * Calibrated against Matt's ratings of ten ranked wrestlers (29 September 2026). He rated a state
 * champion with no Tournament of Champions result a 4 of 5 in-state - Keyshon Morrison, Drew
 * Teeter, Mason Hollar - and the first version, which added the two events together, gave them
 * about a third of the category. A credential is not diluted by the event he did not enter. The
 * Tournament of Champions still ranks above States, title for title.
 */
function finishPart(tocRows: readonly NationalEventRow[], statePlaces: ReadonlyArray<number | null>): StarPart {
  const max = PART_MAX.finish
  const toc = bestPlace(tocRows.map((r) => r.placement))
  const state = bestPlace(statePlaces)
  const tocPoints = !tocRows.length ? 0 : toc === 1 ? 27 : toc === 2 ? 22 : toc != null && toc <= 4 ? 18 : toc != null ? 12 : 6
  const statePoints =
    state == null ? (statePlaces.length ? 6 : 0) : state === 1 ? 22 : state === 2 ? 18 : state <= 4 ? 15 : state <= 6 ? 12 : 9
  const titles = statePlaces.filter((p) => p === 1).length
  const tocYear = tocRows.find((r) => r.placement === toc)?.year ?? tocRows[0]?.year
  const tocText = !tocRows.length ? null : toc != null ? `Tournament of Champions ${toc === 1 ? "champion" : placeWord(toc)} ${tocYear}` : "Tournament of Champions entrant"
  const stateText =
    state == null ? (statePlaces.length ? "State qualifier" : null) : titles > 1 ? `${titles}\u00d7 state champion` : state === 1 ? "State champion" : `State ${placeWord(state)}`
  if (!tocPoints && !statePoints) return { label: "Best in-state finish", points: 0, max, detail: "No Tournament of Champions or NCHSAA result on file" }
  const lead = tocPoints >= statePoints ? tocText : stateText
  const other = tocPoints >= statePoints ? stateText : tocText
  return {
    label: "Best in-state finish",
    points: Math.max(tocPoints, statePoints),
    max,
    detail: other ? `${lead} (also ${other.charAt(0).toLowerCase()}${other.slice(1)})` : lead!,
  }
}

/**
 * Significant wins, one count per opponent however many times he was beaten, weighted by the
 * opponent's standing. A bonus on top of the finish, not a second résumé.
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
  const points = Math.min(
    Math.round(Math.min(count.national * 2, 4) + Math.min(count.champion, 3) + Math.min(count.other * 0.25, 2)),
    PART_MAX.wins,
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

/**
 * How far a wrestler got at a national event.
 *
 * Only NHSCA, Super 32 and Fargo places count in full. Matt rated Brieon Mayfield's Super 32 Early
 * Entry title and Luke Richards' Journeymen runner-up a 3 of 5 on nationals and NHSCA placers a 4:
 * a qualifier finish is worth what a deep run at a main event is worth, no more. A deep run without
 * a place still counts - Campbell Tufts went 7-2 at the 2026 NHSCA and lost in the blood round.
 */
function depthPart(rows: readonly NationalEventRow[]): StarPart {
  const max = PART_MAX.depth
  const main = rows.filter((r) => MAIN_EVENT.test(r.event))
  const qualifiers = rows.filter((r) => !MAIN_EVENT.test(r.event))
  const options: Array<{ points: number; detail: string }> = []

  const mainPlace = bestPlace(main.map((r) => (r.placement != null && r.placement <= 8 ? r.placement : null)))
  if (mainPlace != null) {
    const row = main.find((r) => r.placement === mainPlace)!
    options.push({ points: mainPlace === 1 ? 20 : mainPlace <= 4 ? 17 : 14, detail: `${placeWord(mainPlace)} at ${row.year} ${row.event}` })
  }
  const deepest = main
    .map((r) => ({ row: r, wins: parseRecord(r.record).wins }))
    .sort((a, b) => b.wins - a.wins)[0]
  if (deepest && deepest.wins >= 4) {
    options.push({
      points: deepest.wins >= 6 ? 8 : 4,
      detail: `${deepest.row.record} at ${deepest.row.year} ${deepest.row.event}, no place${deepest.wins >= 6 ? " (blood round or deeper)" : ""}`,
    })
  }
  const qualifierPlace = bestPlace(qualifiers.map((r) => r.placement))
  if (qualifierPlace != null) {
    const row = qualifiers.find((r) => r.placement === qualifierPlace)!
    options.push({ points: qualifierPlace === 1 ? 8 : qualifierPlace <= 4 ? 6 : 3, detail: `${placeWord(qualifierPlace)} at ${row.year} ${row.event}` })
  }

  const best = options.sort((a, b) => b.points - a.points)[0]
  if (!best) return { label: "National placement", points: 0, max, detail: rows.length ? "No place or deep run" : "No national events on file" }
  return { label: "National placement", points: best.points, max, detail: best.detail }
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
    points: Math.round(Math.min(rows.length * 1.25, PART_MAX.participation)),
    max: PART_MAX.participation,
    detail: `${rows.length} national event${rows.length === 1 ? "" : "s"}`,
  }
}

/** RecruitNC's own class ranking, when that class is published. */
function rankingPoints(ranking: number | null, published: boolean): { points: number; detail: string } {
  if (!published || ranking == null) {
    return { points: 0, detail: "Not in a published RecruitNC class ranking" }
  }
  const points = ranking <= 5 ? 34 : ranking <= 10 ? 30 : ranking <= 20 ? 27 : 20
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
const STAR_BANDS = [66, 45, 25] as const

/**
 * The fewest stars a published class ranking allows. Every wrestler Matt rated from the top ten
 * was a 4 and every one from #21 to #27 a 3; without a floor a ranked wrestler could show fewer
 * stars than an unranked one, and a coach reads that as an error.
 */
export function rankingFloor(ranking: number | null, published: boolean): number {
  if (!published || ranking == null) return 1
  if (ranking <= 10) return 4
  return 3
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
   * Holds a wrestler at four stars at least. Five is only ever set by hand.
   */
  nationallyRanked: boolean
}

/**
 * Whether a wrestler's class is rated at all: the current seniors and juniors, and only while
 * their class ranking is published.
 *
 * Matt, 29 September 2026: stars for 2027 and 2028, not 2029. The classes roll forward each July
 * with the signing class, so next summer this becomes 2028 and 2029 without an edit.
 *
 * The younger classes are the reason. A freshman's record is thin by definition, and a rating
 * built only from results reads that thinness as weakness — Devin Hord, ranked #19 nationally
 * as a Class of 2030 wrestler, scored 14 out of 100. When 2029 was published it came with 92
 * one-star sophomores. The honest answer for an underclassman is no star at all.
 */
export function isRatedClass(graduationYear: number | null | undefined, now: Date = new Date()): boolean {
  if (!isPublicRankingsYearPublished(graduationYear)) return false
  const seniors = getCurrentSigningClass(now)
  return graduationYear === seniors || graduationYear === seniors + 1
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

  const instateParts = [finishPart(tocRows, input.statePlaces), winsPart(input.significantWins)]
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
   * The formula tops out at four. Five stars is a person's call, set by hand on the ranking board.
   *
   * Matt, 29 September 2026. The earlier rule gave five to any nationally ranked wrestler whose
   * record earned four, which made Keyshon Morrison a five when Matt rates him a four. A national
   * ranking still holds a wrestler at four: it is a real credential, and never a reason for less.
   */
  const earned = starsForScore(score)
  const floor = credentialFloor(input)
  const stars = Math.max(earned, floor.stars)

  return {
    stars,
    score,
    components,
    provisional,
    ...(floor.stars > earned && floor.reason ? { floor: `Held at ${floor.stars}: ${floor.reason}` } : {}),
  }
}

/** Distinct opponents among the significant wins. Beating one wrestler three times is one win here. */
function distinctSignificantWins(wins: StarRatingInput["significantWins"]): number {
  return new Set(wins.map((w) => w.opponent.trim().toLowerCase())).size
}

function recordAt(rows: readonly NationalEventRow[], event: RegExp): Array<{ wins: number; losses: number; placement: number | null }> {
  return rows.filter((r) => event.test(r.event)).map((r) => ({ ...parseRecord(r.record), placement: r.placement }))
}

/**
 * The fewest stars a credential allows, whatever the score. Matt's rules, 29 September 2026:
 *
 *   4  a winning record at Super 32 (the main event, not a qualifier)
 *   4  NHSCA All-American, more than five significant wins, and a state placing - all three
 *   4  a state placing and a win over a nationally ranked opponent
 *   4  top-10 class ranking, or any national ranking
 *   3  a state placing with wins over three or more state champions, or a winning NHSCA record
 *
 * The three-star rule counts state champions beaten, not every significant win: almost every
 * placer has beaten three other placers on the way, and counting those put half the 2027 class
 * at three stars.
 *   3  any published class ranking
 *   2  a state placing
 *
 * The score still decides everyone above their floor. A floor only ever raises a star, and it
 * never reaches five: five is hand-set.
 */
export function credentialFloor(input: StarRatingInput): { stars: number; reason: string | null } {
  const rules: Array<[number, boolean, string]> = []
  const placer = bestPlace(input.statePlaces) != null
  const sigWins = distinctSignificantWins(input.significantWins)
  const beaten = (kind: (w: StarRatingInput["significantWins"][number]) => boolean) =>
    distinctSignificantWins(input.significantWins.filter(kind))
  const nationallyRankedBeaten = beaten((w) => w.reason === "national-ranked")
  const championsBeaten = beaten((w) => w.reason === "state-champion" || /champion/i.test(w.stateLabel ?? ""))
  const nhsca = recordAt(input.nationalRows, /^NHSCA Nationals$/i)
  const super32 = recordAt(input.nationalRows, /^Super 32$/i)
  const allAmerican = nhsca.some((r) => r.placement != null && r.placement <= 8)
  const ranking = input.rankingPublished ? input.prospectRanking : null

  rules.push([4, super32.some((r) => r.wins > r.losses), "winning record at Super 32"])
  rules.push([4, allAmerican && sigWins > 5 && placer, "NHSCA All-American, state placer, more than five significant wins"])
  rules.push([4, placer && nationallyRankedBeaten > 0, "state placer with a win over a nationally ranked opponent"])
  rules.push([4, ranking != null && ranking <= 10, `RecruitNC top 10 (#${ranking})`])
  rules.push([4, input.nationallyRanked, "nationally ranked"])
  rules.push([3, placer && championsBeaten >= 3, `state placer who has beaten ${championsBeaten} state champions`])
  rules.push([3, placer && nhsca.some((r) => r.wins > r.losses), "state placer with a winning NHSCA record"])
  rules.push([3, ranking != null, `ranked in the class (#${ranking})`])
  rules.push([2, placer, "state placer"])

  const met = rules.filter(([, ok]) => ok).sort((a, b) => b[0] - a[0])[0]
  return met ? { stars: met[0], reason: met[2] } : { stars: 1, reason: null }
}
