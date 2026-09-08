import type { SupabaseClient } from "@supabase/supabase-js"
import { getAthleteNameSearchVariants, namesLikelySamePerson } from "@/lib/athlete-name-match"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import {
  applyStarOverride,
  isRatedAthlete,
  rateAthlete,
  type StarRating,
} from "@/lib/athlete-star-rating"
import { nationalEventRows, starOverrideOf, statePlaces as statePlacesOf } from "@/lib/athlete-star-rating-load"
import { summarizeNationalExposure, summarizeSeasonStrength } from "@/lib/competition-strength"
import { loadNationallyRankedIds } from "@/lib/national-rankings"
import { findSignificantLosses, findSignificantWins, type SignificantWin } from "@/lib/significant-wins"
import { loadOpponentIndex } from "@/lib/scouting-report"
import {
  buildNhscaDuals2026LiveProfileResults,
  mergeNationalTeamResultsForProfile,
  type ProfileNationalTeamResult,
} from "@/lib/national-team-live-profile-results"
import { fetchNhscaDualsSnapshot } from "@/lib/nhsca-duals-live-results/db"
import {
  datedMeetingsAgainst,
  holdsHeadToHeadEdge,
  resolvePairing,
  HEAD_TO_HEAD_WINDOW_DAYS,
  type DatedMeeting,
} from "@/lib/head-to-head"
import { loadQualifierHeadToHead, type QualifierHeadToHeadIndex } from "@/lib/other-tournaments"
import { placementPoints, recordWinPctPoints } from "@/lib/toc/athlete-compare"
import { HEAD_TO_HEAD_MAX_GAP, filterFargoFreestyleResults, scoreNchsaaRowsForSeed } from "@/lib/toc/ai-seeding"
import { getNationalTeamResults } from "@/lib/tournament-utils"

type EvidenceKind =
  | "head_to_head"
  | "match_resume"
  | "national"
  | "state"
  | "duals"
  | "college_open"
  | "achievement"
  | "rankwrestler"
  | "data_gap"

export type RankingEvidence = {
  kind: EvidenceKind
  label: string
  points?: number
  tone?: "gold" | "blue" | "purple" | "green" | "orange" | "red" | "slate"
}

export type RankingScoreBreakdown = {
  /** All-American finishes at NHSCA, Fargo or Super 32 — the strongest single credential. */
  allAmerican: number
  /** Wins over nationally ranked, state-ranked or Tournament of Champions wrestlers. */
  rankedWins: number
  matchResume: number
  state: number
  national: number
  duals: number
  rankWrestler: number
  collegeOpen: number
  profile: number
}

export type RankingHeadToHead = {
  opponentId: string
  opponent: string
  wins: number
  losses: number
  /** Did this wrestler win the most recent meeting? That bout decides the pairing. */
  lastMeetingWon?: boolean
  lastMeetingNote?: string
}

export type RankingBoardAthlete = {
  id: string
  name: string
  highschool: string | null
  graduationyear: number | string | null
  gender: string | null
  weightclass: string | number | null
  prospect_ranking: number | null
  previous_ranking: number | null
  rankwrestler_rank: number | null
  ai_rank: number
  ai_score: number
  confidence: "High" | "Medium" | "Low"
  confidence_reason: string
  score_breakdown: RankingScoreBreakdown
  evidence: RankingEvidence[]
  data_gaps: string[]
  head_to_head: RankingHeadToHead[]
  nchsaa_count: number
  national_count: number
  match_count: number
  win_loss?: string | null
  college?: string | null
  college_opens_experience?: string | null
  achievements?: unknown
  additional_achievements?: string | null
  /**
   * The four things a reviewer actually looks at, lifted out of the evidence list so they can be
   * read from the collapsed row instead of by opening a drawer.
   */
  /** One entry per All-American finish, newest first: "NHSCA 2026 4th". */
  all_american: string[]
  /**
   * The last time this wrestler competed, from any source on file.
   *
   * Shown rather than scored. Wrestling is seasonal, so in September everybody's most recent
   * result is February states or a summer event, and a raw recency penalty would punish the
   * whole class for the calendar. What it is worth knowing is when a résumé has stopped —
   * Hayden Smith holds a ranking on results that a concussion has made static.
   */
  last_competed: string | null
  state_placements: string[]
  nhsca_record: string | null
  super32_record: string | null
  /** Every trip, newest first — "2026 · 4th · 5-2". For the evidence drawer. */
  nhsca_by_year: string[]
  super32_by_year: string[]
  fargo_by_year: string[]
  /**
   * Computed here rather than by a second endpoint. The board already holds the bundle and the
   * season's bouts, and rating separately meant a second full pass over the class — ninety-two
   * athletes at roughly seven hundred milliseconds each, in series, on top of this build.
   */
  star_rating: StarRating | null
  /** Wins over wrestlers who are ranked, nationally ranked, or in the TOC field. */
  significant_wins: Array<{ opponent: string; result: string | null; event: string | null; standing: string }>
  /**
   * Losses to that same calibre of opponent. Shown beside the wins, and not scored — see where
   * they are built for why.
   */
  significant_losses: Array<{
    opponent: string
    result: string | null
    event: string | null
    standing: string
    /** Beaten by somebody ranked below them in the same class — the order says one thing, the mat said another. */
    upset: boolean
  }>
}

type MatchBout = {
  opponent?: string
  opponent_name?: string
  opponent_school?: string
  result?: string
  method?: string
  venue?: string
  tournament?: string
  win_loss?: string
  opponent_percentage?: string | number | null
  /** Present on both season and qualifier rows; the reason "last competed" had to cast to reach it. */
  date?: string | null
}

type MatchRow = {
  athlete_id?: string | null
  season?: string | null
  total_matches?: number | null
  wins?: number | null
  losses?: number | null
  matches?: MatchBout[] | string | null
}

type CandidateIdentity = {
  id: string
  name: string
}

type HistoricalDualsWrestler = {
  id: string
  first_name?: string | null
  last_name?: string | null
  high_school?: string | null
}

type HistoricalDualsResult = {
  wrestler_id?: string | null
  record?: string | null
  wins?: number | null
  losses?: number | null
  nc_united_tournaments?: { name?: string | null; year?: number | string | null } | null
  tournament?: { name?: string | null; year?: number | string | null } | null
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function placementNumber(value: unknown): number | null {
  const text = String(value ?? "").trim().toLowerCase()
  if (!text) return null
  if (text.includes("champion") && !text.includes("2x")) return 1
  const match = text.match(/(\d+)/)
  if (!match) return null
  const place = Number.parseInt(match[1], 10)
  return Number.isFinite(place) ? place : null
}

/** "4th", "Champion", "8th All-American" — only a real finish counts, never a round. */
function placementNumberOf(raw: unknown): number | null {
  const value = String(raw ?? "").trim()
  if (!value) return null
  if (/champ/i.test(value)) return 1
  if (/runner|finalist/i.test(value)) return 2
  const m = value.match(/(\d{1,2})/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null
}

/**
 * One line of the wins/losses lists: who it was against, and how good they are.
 *
 * The standing carries the opponent's actual number wherever there is one. "ranked in North
 * Carolina" covers #2 and #38 equally, which is no help to a reviewer deciding between two
 * résumés — the whole question is how good the opponent was. This is admin-only: classes are
 * ranked privately before they are published, and the public profile route names the fields it
 * returns, so the number never leaves this board.
 */
/**
 * Results from the last twelve months, which is the only window a ranking argument lives in.
 *
 * Season bouts were already limited to the latest season on file, but qualifier results were not
 * windowed at all — a Super 32 Early Entry win from two years ago counted exactly as much as one
 * from September. A ranking is a claim about who somebody is now, and the same twelve months
 * already govern head-to-head, so the two now agree.
 *
 * An undated row is kept rather than dropped, matching `getQualifierSignificantWinBouts`: the
 * date is missing from the record, not from history, and discarding a real result because an
 * importer left a blank would quietly shrink a résumé.
 */
export function withinRankingWindow<T extends { date?: string | null }>(
  bouts: readonly T[],
  now: number = Date.now(),
): T[] {
  const cutoff = now - HEAD_TO_HEAD_WINDOW_DAYS * 86_400_000
  return bouts.filter((bout) => {
    const at = bout.date ? Date.parse(String(bout.date)) : Number.NaN
    return !Number.isFinite(at) || at >= cutoff
  })
}

/**
 * A loss that contradicts the ranking: beaten by somebody this board places below them.
 *
 * The strongest argument that an order is wrong. If we say this wrestler is #4 and the boy who
 * beat them is #19, one of those two numbers is wrong — that is worth a reviewer's eye far more
 * than another line in a résumé, and it is invisible when losses are only listed and not compared.
 *
 * Same class only. Rankings are per graduation year, so a 2027 wrestler losing to the #5 in the
 * 2026 class is not an upset by any reading — those two numbers describe different fields and
 * comparing them would flag half the board for nothing. Both wrestlers must also carry a
 * published ranking: an unranked opponent has no number to contradict.
 */
export function isUpsetLoss(
  loss: Pick<SignificantWin, "reason" | "opponentRanking" | "opponentGraduationYear">,
  ownRanking: number | null,
  ownGraduationYear: number | null,
): boolean {
  if (loss.reason !== "ranked") return false
  if (ownRanking == null || loss.opponentRanking == null) return false
  if (ownGraduationYear == null || loss.opponentGraduationYear == null) return false
  if (loss.opponentGraduationYear !== ownGraduationYear) return false
  // Lower number is the better ranking, so an opponent with a bigger number sits below them.
  return loss.opponentRanking > ownRanking
}

function significantBoutRow(bout: SignificantWin): {
  opponent: string
  result: string | null
  event: string | null
  standing: string
} {
  return {
    opponent: bout.opponent,
    result: bout.result,
    event: bout.event,
    standing:
      bout.reason === "national-ranked"
        ? bout.nationalRankLabel
          ? `nationally ranked, ${bout.nationalRankLabel}`
          : "nationally ranked"
        : bout.reason === "toc-field"
          ? "Tournament of Champions field"
          : bout.opponentRanking != null
            ? `NC #${bout.opponentRanking}`
            : "ranked in North Carolina",
  }
}

function ordinal(place: number): string {
  const mod100 = place % 100
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`
  if (place % 10 === 1) return `${place}st`
  if (place % 10 === 2) return `${place}nd`
  if (place % 10 === 3) return `${place}rd`
  return `${place}th`
}

function textHasCollegeOpenSignal(text: string): boolean {
  return /college\s+open|open tournament|unc open|app state open|wolfpack open|mount olive open|roanoke open|newberry open|citadel open|freshman-sophomore open/i.test(
    text,
  )
}

function achievementText(athlete: Record<string, unknown>): string {
  return [
    athlete.achievements,
    athlete.additional_achievements,
    athlete.nationally_ranked_wins,
    athlete.college_opens_experience,
  ]
    .map((value) =>
      typeof value === "string" ? value : Array.isArray(value) ? value.join(" ") : value ? JSON.stringify(value) : "",
    )
    .join(" ")
}

function parseBouts(value: MatchRow["matches"]): MatchBout[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as MatchBout[]) : []
  } catch {
    return []
  }
}

function didWinBout(bout: MatchBout): boolean {
  const result = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return result === "W" || result.startsWith("W ") || result.includes("WIN")
}

function didLoseBout(bout: MatchBout): boolean {
  const result = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return result === "L" || result.startsWith("L ") || result.includes("LOSS")
}

export function latestProspectMatchRows(rows: MatchRow[]): MatchRow[] {
  const seasons = rows.map((row) => String(row.season ?? "").trim()).filter(Boolean)
  if (!seasons.length) return rows
  const latestSeason = seasons.reduce((latest, season) => (season > latest ? season : latest))
  return rows.filter((row) => String(row.season ?? "").trim() === latestSeason)
}

async function fetchMatchRows(supabase: SupabaseClient, athleteIds: string[]): Promise<Map<string, MatchRow[]>> {
  const byAthlete = new Map<string, MatchRow[]>()
  if (!athleteIds.length) return byAthlete

  const { data, error } = await supabase
    .from("matches")
    .select("athlete_id,season,total_matches,wins,losses,matches")
    .in("athlete_id", athleteIds)

  if (error || !data) return byAthlete
  for (const row of data as MatchRow[]) {
    const athleteId = row.athlete_id
    if (!athleteId) continue
    byAthlete.set(athleteId, [...(byAthlete.get(athleteId) || []), row])
  }
  return byAthlete
}

/** Mirrors the TOC match-résumé score: quality wins, overall record, and data depth. */
export function scoreProspectMatchResume(rows: MatchRow[]): {
  score: number
  totalMatches: number
  wins: number
  losses: number
  qualityWins: number
  qualityWinEvidence: Array<{ opponent: string; points: number; percentage: number }>
} {
  let score = 0
  let totalMatches = 0
  let wins = 0
  let losses = 0
  let qualityWins = 0
  let qualityWinPoints = 0
  const qualityWinEvidence: Array<{ opponent: string; points: number; percentage: number }> = []

  for (const row of rows) {
    totalMatches += Number(row.total_matches || 0)
    wins += Number(row.wins || 0)
    losses += Number(row.losses || 0)
    for (const bout of parseBouts(row.matches)) {
      const opponentPercentage = toNumber(bout.opponent_percentage)
      if (!didWinBout(bout) || opponentPercentage == null || opponentPercentage < 95) continue
      const points = opponentPercentage >= 98 ? 8 : 5
      qualityWins += 1
      qualityWinPoints += points
      qualityWinEvidence.push({
        opponent: String(bout.opponent_name ?? bout.opponent ?? "quality opponent"),
        points,
        percentage: opponentPercentage,
      })
    }
  }

  /**
   * Strength of schedule, on a curve rather than a ceiling.
   *
   * This was `Math.min(qualityWinPoints, 30)`, and thirty was low enough that thirty-four of the
   * thirty-eight ranked wrestlers in the Class of 2028 reached it. They all scored the same.
   * Uncapped, that same field runs from 180 to 458 — Hayden Smith has 64 wins over top-5%
   * opponents and 46 of them against the top 2%, Jake Amiott 50 and 40 — so the one number that
   * measures who a wrestler actually beat was the one number carrying no information at all.
   *
   * A square root keeps every place in that order while stopping a long season from running away
   * with the board: doubling the quality wins is worth about forty per cent more, not double.
   */
  score += Math.round(Math.sqrt(Math.max(qualityWinPoints, 0)) * 2.8 * 10) / 10
  if (totalMatches > 0) {
    score += Math.round((wins / Math.max(totalMatches, 1)) * 18)
    if (totalMatches >= 35) score += 5
    else if (totalMatches >= 20) score += 3
    else if (totalMatches < 8) score -= 4
  }

  return {
    score,
    totalMatches,
    wins,
    losses,
    qualityWins,
    qualityWinEvidence,
  }
}

export function buildCandidateHeadToHead(
  athlete: CandidateIdentity,
  candidates: CandidateIdentity[],
  currentSeasonBoutsByAthleteId: Map<string, MatchBout[]>,
  /** Qualifier meetings keyed athleteId -> opponentId, when the caller has them. */
  qualifierHeadToHead?: QualifierHeadToHeadIndex,
): RankingHeadToHead[] {
  const records: RankingHeadToHead[] = []
  const athleteBouts = currentSeasonBoutsByAthleteId.get(athlete.id) ?? []
  const qualifierSide = qualifierHeadToHead?.get(athlete.id)

  for (const opponent of candidates) {
    if (opponent.id === athlete.id) continue
    // Same rule as TOC seeding, from the same module: last 12 months only, and the most
    // recent meeting decides. Two tools ranking the same wrestlers on the same evidence
    // must not disagree about who beat whom.
    const meetings: DatedMeeting[] = [
      ...datedMeetingsAgainst(athleteBouts, opponent.name),
      ...datedMeetingsAgainst(currentSeasonBoutsByAthleteId.get(opponent.id) ?? [], athlete.name, true),
      ...(qualifierSide?.get(opponent.id)?.meetings ?? []).map((m) => ({
        at: m.at,
        won: m.won,
        summary: m.summary,
      })),
    ]
    const pairing = resolvePairing(meetings)
    if (!pairing.wins && !pairing.losses) continue
    records.push({
      opponentId: opponent.id,
      opponent: opponent.name,
      wins: pairing.wins,
      losses: pairing.losses,
      lastMeetingWon: pairing.lastMeetingWon ?? undefined,
      lastMeetingNote: pairing.lastMeetingNote ?? undefined,
    })
  }

  return records
}

/**
 * Same pairwise rule as TOC seeding: a current-season direct winner stays above
 * the loser when the two résumés are within one placement tier (20 points).
 */
/**
 * A direct win outranks a résumé, within reach.
 *
 * The same rule and the same number as TOC seeding, deliberately: two tools that rank the same
 * wrestlers on the same evidence should not disagree about who beat whom. It reached 20 points
 * here too, which never fired — one state title scores forty-eight — and removing the limit
 * outright let a wrestler with one upset win invert a whole board.
 */
export function orderProspectsByHeadToHead<T extends {
  id: string
  name: string
  ai_score: number
  head_to_head: RankingHeadToHead[]
}>(rows: T[]): T[] {
  const remaining = [...rows]
  const ordered: T[] = []

  while (remaining.length > 0) {
    const eligible = remaining.filter((candidate) =>
      !remaining.some((other) => {
        if (other.id === candidate.id) return false
        const record = other.head_to_head.find((meeting) => meeting.opponentId === candidate.id)
        return Boolean(
          record && holdsHeadToHeadEdge(record) && other.ai_score >= candidate.ai_score - HEAD_TO_HEAD_MAX_GAP,
        )
      }),
    )

    const pool = eligible.length > 0 ? eligible : remaining
    pool.sort((a, b) => b.ai_score - a.ai_score || a.name.localeCompare(b.name))
    const next = pool[0]
    ordered.push(next)
    remaining.splice(remaining.indexOf(next), 1)
  }

  return ordered
}

function rankWrestlerPoints(rank: number | null): number {
  if (rank == null) return 0
  if (rank <= 1) return 18
  if (rank <= 3) return 15
  if (rank <= 8) return 10
  if (rank <= 16) return 6
  return 3
}

/**
 * Qualifier results count for less than the national tournament they feed. Placing at
 * Super 32 Early Entry is a strong signal, but it is not placing at Super 32.
 */
const QUALIFIER_WEIGHT = 0.6

function evidenceToneForPlace(place: number): RankingEvidence["tone"] {
  if (place === 1) return "gold"
  if (place <= 3) return "blue"
  return "purple"
}

function evidencePriority(item: RankingEvidence): number {
  if (item.kind === "head_to_head") return 1000
  if (item.kind === "data_gap") return -1000
  return item.points ?? 0
}

function nationalTeamEventLabel(tournamentName: string): string | null {
  const normalized = tournamentName.toLowerCase()
  if (normalized.includes("ultimate club duals")) return "Ultimate Club Duals"
  if (normalized.includes("nhsca") && /national duals|duals|dual/.test(normalized)) return "NHSCA National Duals"
  return null
}

function schoolLikelySame(a: unknown, b: unknown): boolean {
  const left = String(a ?? "").trim().toLowerCase()
  const right = String(b ?? "").trim().toLowerCase()
  if (!left || !right) return true
  return left.includes(right) || right.includes(left)
}

/**
 * Board-wide NC United/NHSCA Duals loader.
 *
 * The profile helper is intentionally optimized for one athlete. Calling it for
 * an entire graduation class re-fetched the live snapshot and historical tables
 * once per athlete (83 candidates took ~95 seconds). This version reads each
 * source once, then performs the same name matching and merge in memory.
 */
async function loadRankingDualsByAthlete(
  supabase: SupabaseClient,
  athleteRows: Array<Record<string, unknown>>,
): Promise<Map<string, ProfileNationalTeamResult[]>> {
  const out = new Map<string, ProfileNationalTeamResult[]>()
  const candidates = athleteRows.map((athlete) => {
    const name = String(athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`).trim()
    return {
      id: String(athlete.id),
      name,
      highSchool: String(athlete.highschool ?? "").trim(),
      nameBases: [...new Set([name, ...getAthleteNameSearchVariants(name)].map((value) => value.trim()).filter(Boolean))],
      athlete,
    }
  })

  const [snapshotResult, wrestlersResult] = await Promise.all([
    fetchNhscaDualsSnapshot(supabase).catch(() => null),
    supabase.from("nc_united_wrestlers").select("id,first_name,last_name,high_school").limit(2000),
  ])
  const snapshot = snapshotResult?.ok ? snapshotResult.data : null
  const wrestlers = wrestlersResult.error ? [] : ((wrestlersResult.data || []) as HistoricalDualsWrestler[])

  const candidateIdsByWrestlerId = new Map<string, string[]>()
  for (const wrestler of wrestlers) {
    const wrestlerName = `${wrestler.first_name ?? ""} ${wrestler.last_name ?? ""}`.trim()
    if (!wrestler.id || !wrestlerName) continue
    for (const candidate of candidates) {
      if (!candidate.nameBases.some((name) => namesLikelySamePerson(name, wrestlerName))) continue
      if (!schoolLikelySame(candidate.highSchool, wrestler.high_school)) continue
      candidateIdsByWrestlerId.set(wrestler.id, [
        ...(candidateIdsByWrestlerId.get(wrestler.id) || []),
        candidate.id,
      ])
    }
  }

  const wrestlerIds = [...candidateIdsByWrestlerId.keys()]
  let historicalRows: HistoricalDualsResult[] = []
  if (wrestlerIds.length) {
    const primary = await supabase
      .from("nc_united_tournament_results")
      .select("wrestler_id,record,wins,losses,nc_united_tournaments(name,year)")
      .in("wrestler_id", wrestlerIds)
    if (!primary.error && primary.data) {
      historicalRows = primary.data as HistoricalDualsResult[]
    } else {
      const fallback = await supabase
        .from("nc_united_tournament_results")
        .select("wrestler_id,record,wins,losses,tournament(name,year)")
        .in("wrestler_id", wrestlerIds)
      if (!fallback.error && fallback.data) historicalRows = fallback.data as HistoricalDualsResult[]
    }
  }

  const historicalByAthleteId = new Map<string, ProfileNationalTeamResult[]>()
  for (const row of historicalRows) {
    const tournament = row.nc_united_tournaments ?? row.tournament
    const event = nationalTeamEventLabel(String(tournament?.name ?? ""))
    const year = Number(tournament?.year)
    if (!event || !Number.isFinite(year)) continue
    const record = String(row.record ?? "").trim() || `${Number(row.wins || 0)}-${Number(row.losses || 0)}`
    for (const candidateId of candidateIdsByWrestlerId.get(String(row.wrestler_id ?? "")) || []) {
      historicalByAthleteId.set(candidateId, [
        ...(historicalByAthleteId.get(candidateId) || []),
        { event, year, record },
      ])
    }
  }

  for (const candidate of candidates) {
    const fromLive = snapshot ? buildNhscaDuals2026LiveProfileResults(snapshot, candidate.nameBases) : []
    out.set(
      candidate.id,
      mergeNationalTeamResultsForProfile({
        fromTable: historicalByAthleteId.get(candidate.id) || [],
        fromAthleteRow: getNationalTeamResults(candidate.athlete),
        fromLive,
        fromRegistration: [],
      }),
    )
  }

  return out
}

/**
 * What each part of a résumé is worth, relative to the others.
 *
 * The state component used to dominate: a classification is worth up to 25 on its own, a title
 * another 8, and Connor Reece's 8A championship alone scored 82 — more than any other component
 * can reach. That made sense with four classifications. With eight there are eight state
 * champions at every weight, some of whom never met a ranked wrestler, so a title says far less
 * about where somebody belongs than it used to. It is now the smallest input, not the largest.
 *
 * What replaces it is what a college coach actually asks: who did they wrestle, did they beat
 * the people around them, and how did they do outside North Carolina.
 *
 * `collegeOpen` and `profile` are zeroed rather than reduced. Both scored free text — `profile`
 * ran a regex for words like "all-american" over whatever an athlete had typed, and awarded 10
 * points for finding them. Jake Amiott is a Fargo All-American and scored 0 there because he had
 * not written it down; Connor Reece scored 10 because he had. Eighteen points of a teenager's
 * public ranking turned on how much they filled in a form, which is not a result and cannot be
 * defended to the family of the wrestler it ranks below.
 */
export const RANKING_COMPONENT_WEIGHTS: Record<keyof RankingScoreBreakdown, number> = {
  /**
   * The order asked for, loudest first: All-American honours, then who they beat, then the
   * national event records, and state placement last.
   *
   * Placing at NHSCA, Fargo or Super 32 is the hardest thing on any of these résumés and the
   * least ambiguous — a top-eight finish in a national bracket needs no context. Beating a ranked
   * wrestler is the next best, because it is a direct measurement rather than an inference.
   */
  allAmerican: 1,
  rankedWins: 1,
  /** Who they wrestled and how they did — includes wins over top-percentile opponents. */
  matchResume: 1.1,
  /** The event records themselves: Super 32, then NHSCA, then Fargo. */
  national: 1.2,
  /** Real, and counted last. Eight classifications means eight champions at every weight. */
  state: 0.35,
  duals: 1.2,
  rankWrestler: 1,
  /** Scored a form field, not a result. */
  collegeOpen: 0,
  /** Scored a regex over free text. */
  profile: 0,
}

function weighted(raw: RankingScoreBreakdown): RankingScoreBreakdown {
  const out = {} as RankingScoreBreakdown
  for (const key of Object.keys(raw) as Array<keyof RankingScoreBreakdown>) {
    out[key] = Math.round(raw[key] * RANKING_COMPONENT_WEIGHTS[key] * 10) / 10
  }
  return out
}

/** Runs `worker` over `items`, at most `limit` in flight, preserving order. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      out[index] = await worker(items[index]!, index)
    }
  })
  await Promise.all(runners)
  return out
}

export async function buildRecruitNcRankingBoard({
  supabase,
  year,
  gender,
}: {
  supabase: SupabaseClient
  year: string
  gender: string
}): Promise<RankingBoardAthlete[]> {
  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("graduationyear", year)
    .ilike("gender", gender)
    /**
     * These are North Carolina rankings, so a wrestler who has left the state is not in them.
     *
     * The board never checked this. Jack Harty transferred to Greens Farms Academy in
     * Connecticut and still placed fourth in the Class of 2027 on the strength of an NC résumé
     * he is no longer adding to. `is_nc_athlete` was already on the row and already false for
     * twenty-three athletes; nothing was reading it.
     */
    .eq("is_nc_athlete", true)
    .order("prospect_ranking", { ascending: true })
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)

  const athleteRows = (athletes || []) as Array<Record<string, unknown>>
  const athleteIds = athleteRows.map((athlete) => String(athlete.id)).filter(Boolean)
  const [matchRowsByAthlete, dualsByAthlete, qualifierHeadToHead] = await Promise.all([
    fetchMatchRows(supabase, athleteIds),
    loadRankingDualsByAthlete(supabase, athleteRows),
    loadQualifierHeadToHead(supabase, athleteIds).catch(() => new Map() as QualifierHeadToHeadIndex),
  ])
  const candidates: CandidateIdentity[] = athleteRows.map((athlete) => ({
    id: String(athlete.id),
    name: String(athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`).trim(),
  }))
  // One index for the whole class: who is ranked, nationally ranked, or in the TOC field.
  /**
   * RankWrestler's latest published number, from `rankwrestler_rankings`.
   *
   * The engine has always read `athlete.rankwrestler_rank`, `rank_wrestler_rank` and `rw_rank`,
   * none of which are columns on `athletes` — so this component scored zero for every wrestler
   * since it was written, and the badge showed nothing. Their ranks only move in season, so the
   * most recent edition stands until somebody wrestles.
   */
  const rankWrestlerByAthleteId = new Map<string, number>()
  {
    const { data: rwRows } = await supabase
      .from("rankwrestler_rankings")
      .select("athlete_id, rank, edition")
      .eq("class_year", Number(year))
      .not("athlete_id", "is", null)
      .order("edition", { ascending: false })
    for (const row of rwRows ?? []) {
      const athleteId = String((row as { athlete_id?: unknown }).athlete_id ?? "")
      if (athleteId && !rankWrestlerByAthleteId.has(athleteId)) {
        rankWrestlerByAthleteId.set(athleteId, Number((row as { rank?: unknown }).rank))
      }
    }
  }

  const [opponentIndex, nationallyRankedIds] = await Promise.all([
    loadOpponentIndex(supabase).catch(() => ({ tocField: [], ranked: [] })),
    loadNationallyRankedIds(supabase).catch(() => new Set<string>()),
  ])

  /**
   * Qualifier wins, for the whole class in one query.
   *
   * `findSignificantWins` only ever saw the season match import, so six and a half thousand
   * Super 32 Early Entry bouts counted for nothing — a wrestler could beat a nationally ranked
   * opponent in a qualifier final and the board would not mention it. The scouting report has
   * always included them; the ranking board had not.
   */
  const qualifierBoutsByAthleteId = new Map<string, MatchBout[]>()
  {
    const { data: qualifierBouts } = await supabase
      .from("other_tournament_bouts")
      .select("athlete_id, opponent_name, opponent_club, win, is_bye, win_type, score, weight_class, event_name, event_date")
      .in("athlete_id", athleteIds)
    for (const row of qualifierBouts ?? []) {
      const raw = row as Record<string, unknown>
      if (raw.is_bye || !raw.opponent_name) continue
      const athleteId = String(raw.athlete_id ?? "")
      if (!athleteId) continue
      qualifierBoutsByAthleteId.set(athleteId, [
        ...(qualifierBoutsByAthleteId.get(athleteId) ?? []),
        {
          opponent_name: String(raw.opponent_name),
          opponent_school: (raw.opponent_club as string) ?? null,
          // Losses are loaded too now: `findSignificantLosses` needs them, and a qualifier a
          // wrestler lost is still a date they competed on.
          win_loss: raw.win ? "W" : "L",
          result: [raw.win_type, raw.score].filter(Boolean).join(" ").trim() || undefined,
          date: (raw.event_date as string) ?? undefined,
          // `Bout.venue` is the event name. Using `tournament` here counted the win and lost
          // the tournament it happened at.
          venue: (raw.event_name as string) ?? undefined,
          weight: (raw.weight_class as string) ?? undefined,
        } as MatchBout,
      ])
    }
  }

  const currentSeasonBoutsByAthleteId = new Map(
    athleteIds.map((athleteId) => [
      athleteId,
      latestProspectMatchRows(matchRowsByAthlete.get(athleteId) || []).flatMap((row) => parseBouts(row.matches)),
    ]),
  )

  /**
   * Eight at a time, not ninety at once.
   *
   * This was `Promise.all` over the whole class, so a hundred athletes each firing roughly ten
   * queries hit the database with a thousand at once. It did not fail loudly — the per-athlete
   * bundle has a catch that falls back to empty arrays, so a throttled request became a wrestler
   * with no tournament results at all. Aidan Gore has two NHSCA years on file and the board
   * showed him with none, while the build took the better part of a minute.
   */
  const scored = await mapWithConcurrency(athleteRows, 8, async (athlete) => {
      const id = String(athlete.id)
      const name = String(athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`).trim()
      const evidence: RankingEvidence[] = []
      const dataGaps: string[] = []

      const bundle = await loadAthleteTournamentBundle(supabase, athlete, { nhscaAllTime: true }).catch(() => ({
        nchsaa: [],
        nhsca: [],
        super32: [],
        fargo: [],
        other: [],
      }))
      const duals = dualsByAthlete.get(id) || []

      const state = scoreNchsaaRowsForSeed(bundle.nchsaa || [])
      if (state > 0) {
        evidence.push({ kind: "state", label: "NCHSAA state résumé", points: state, tone: "gold" })
        for (const result of [...(bundle.nchsaa || [])].sort((a, b) => b.year - a.year).slice(0, 3)) {
          const place = Number(result.place)
          if (!Number.isFinite(place) || place < 1) continue
          evidence.push({
            kind: "state",
            label: `${result.year} ${result.classification}: ${place === 1 ? "Champion" : ordinal(place)}`,
            tone: place === 1 ? "gold" : "orange",
          })
        }
      }

      const freestyleFargo = filterFargoFreestyleResults(bundle.fargo || [])
      const nationalRows = [
        ...(bundle.nhsca || []).map((result) => ({ event: "NHSCA", result })),
        ...(bundle.super32 || []).map((result) => ({ event: "Super32", result })),
        ...freestyleFargo.map((result) => ({ event: "Fargo FS", result })),
      ]
      let national = 0
      for (const { event, result } of nationalRows) {
        const place = placementNumber(result.placement)
        const points = placementPoints(place) + recordWinPctPoints(result.record)
        national += points
        const details = [
          place ? (place === 1 ? "Champion" : ordinal(place)) : "",
          result.record ? `${result.record} record` : "",
        ]
          .filter(Boolean)
          .join(" · ")
        evidence.push({
          kind: "national",
          label: `${result.year || ""} ${event}${details ? `: ${details}` : ""}`.trim(),
          points: points || undefined,
          tone: event === "Super32" ? "purple" : evidenceToneForPlace(place || 8),
        })
      }

      // Qualifiers and open events (Super 32 Early Entry, and the GA/VA legs of the same
      // series). Real out-of-state fields, so they count toward the national résumé — but
      // discounted against Super 32 / NHSCA / Fargo themselves, which are the deeper brackets.
      for (const result of bundle.other || []) {
        const points = Math.round(
          (placementPoints(result.placement) + recordWinPctPoints(result.record)) * QUALIFIER_WEIGHT,
        )
        national += points
        const details = [
          result.placement ? (result.placement === 1 ? "Champion" : ordinal(result.placement)) : "",
          result.record ? `${result.record} record` : "",
          result.qualified ? "Super 32 qualifier" : "",
        ]
          .filter(Boolean)
          .join(" · ")
        evidence.push({
          kind: "national",
          label: `${result.year} ${result.eventShortName}${details ? `: ${details}` : ""}`.trim(),
          points: points || undefined,
          tone: result.placement ? evidenceToneForPlace(result.placement) : "purple",
        })
      }

      const matchScore = scoreProspectMatchResume(matchRowsByAthlete.get(id) || [])
      if (matchScore.totalMatches > 0) {
        evidence.push({
          kind: "match_resume",
          label: `${matchScore.wins}-${matchScore.losses} profile match record`,
          points: matchScore.score,
          tone: "green",
        })
      }
      for (const qualityWin of matchScore.qualityWinEvidence.slice(0, 3)) {
        evidence.push({
          kind: "match_resume",
          label: `Quality win over ${qualityWin.opponent} (${qualityWin.percentage}%)`,
          tone: "green",
        })
      }

      const headToHead = buildCandidateHeadToHead(
        { id, name },
        candidates,
        currentSeasonBoutsByAthleteId,
        qualifierHeadToHead,
      )
      const headToHeadWins = headToHead.reduce((sum, record) => sum + record.wins, 0)
      const headToHeadLosses = headToHead.reduce((sum, record) => sum + record.losses, 0)
      if (headToHeadWins || headToHeadLosses) {
        evidence.push({
          kind: "head_to_head",
          label: `Same-class head-to-head, last 12 months: ${headToHeadWins}-${headToHeadLosses}`,
          tone: "green",
        })
        for (const record of headToHead.filter((row) => row.wins > row.losses).slice(0, 3)) {
          evidence.push({
            kind: "head_to_head",
            label: `Direct edge over ${record.opponent}, ${record.wins}-${record.losses}`,
            tone: "green",
          })
        }
      }

      const dualsScore = duals.reduce((sum, result) => sum + recordWinPctPoints(result.record) * 2, 0)
      for (const result of duals.slice(0, 3)) {
        evidence.push({
          kind: "duals",
          label: `${result.year} ${result.event}: ${result.record || "record unavailable"}`,
          points: result.record ? recordWinPctPoints(result.record) * 2 : undefined,
          tone: "blue",
        })
      }

      const rankWrestlerRank = rankWrestlerByAthleteId.get(id) ?? null
      const rankWrestler = rankWrestlerPoints(rankWrestlerRank)
      if (rankWrestlerRank != null) {
        evidence.push({
          kind: "rankwrestler",
          label: `RankWrestler signal #${rankWrestlerRank}`,
          points: rankWrestler,
          tone: "slate",
        })
      }

      const profileText = achievementText(athlete)
      const collegeOpen = athlete.college_opens_experience || textHasCollegeOpenSignal(profileText) ? 8 : 0
      if (collegeOpen) {
        evidence.push({
          kind: "college_open",
          label: "College open experience listed",
          points: collegeOpen,
          tone: "green",
        })
      }

      const profile = /all[- ]?american|national champion|fargo|super\s*32|beast|ironman|powerade|journeymen|4x|four[- ]time/i.test(
        profileText,
      )
        ? 10
        : 0
      if (profile) {
        evidence.push({
          kind: "achievement",
          label: "Elite achievement signal in profile",
          points: profile,
          tone: "slate",
        })
      }

      if (!(bundle.nchsaa || []).length) dataGaps.push("No merged NCHSAA state result")
      if (!nationalRows.length) dataGaps.push("No NHSCA, Super32, or Fargo freestyle result")
      if (!matchScore.totalMatches) dataGaps.push("No profile match history")
      if (!athlete.college_opens_experience) dataGaps.push("No college open detail")
      for (const gap of dataGaps.slice(0, 3)) {
        evidence.push({ kind: "data_gap", label: gap, tone: "red" })
      }

      /**
       * A top-eight finish at NHSCA or Fargo is an All-American, however the row records it.
       * Newest first: the most recent finish is the one worth naming on a card.
       */
      /**
       * Only seasons this wrestler could have wrestled.
       *
       * These results are matched by name, so without a window a namesake from another era lands
       * on the card: a Class of 2027 athlete was shown as a 2007 NHSCA national champion, twenty
       * years before he started high school. A national title on the wrong teenager is the worst
       * thing this board can print.
       */
      const gradYear = toNumber(athlete.graduationyear)
      const plausibleSeason = (year: number) =>
        Number.isFinite(year) && (gradYear == null || (year <= gradYear && year > gradYear - 5))

      const allAmericanRows = [
        ...(bundle.nhsca || []).map((r) => ({ event: "NHSCA", year: Number(r.year), place: placementNumberOf(r.placement) })),
        ...(bundle.fargo || []).map((r) => ({ event: "Fargo", year: Number(r.year), place: placementNumberOf(r.placement) })),
      ]
        .filter((r) => r.place != null && r.place >= 1 && r.place <= 8 && plausibleSeason(r.year))
        .sort((a, b) => b.year - a.year)
      /**
       * Every All-American finish, one per pill.
       *
       * A single "All-American" badge said nothing about how many, at which event, or how high.
       * A wrestler who placed fourth at NHSCA in 2026 and eighth at Fargo in 2025 has two
       * results, and both belong on the card: "NHSCA 2026 4th", "Fargo 2025 8th".
       */
      const allAmerican = allAmericanRows.map(
        (row) => `${row.event} ${row.year} ${ordinal(row.place!)}`,
      )

      const statePlacements = [...(bundle.nchsaa || [])]
        .filter((r) => Number(r.place) >= 1)
        .sort((a, b) => b.year - a.year)
        .map((r) => `${r.year} ${r.classification} ${Number(r.place) === 1 ? "champion" : ordinal(Number(r.place))}`)

      /**
       * The most recent trip, not a career total.
       *
       * Adding every year together said a wrestler was 15-6 at NHSCA without saying whether that
       * was one strong showing or four thin ones, and it buried the trip that actually matters —
       * the last one. The per-year lines go in the drawer.
       */
      const latestRecord = (rows: Array<{ year?: number; record?: string | null; placement?: string | null }>) => {
        const dated = rows
          .filter((r) => plausibleSeason(Number(r.year)) && /^\d+\s*-\s*\d+$/.test(String(r.record ?? "").trim()))
          .sort((a, b) => Number(b.year) - Number(a.year))
        const latest = dated[0]
        return latest ? `${latest.year} ${String(latest.record).trim()}` : null
      }
      const byYear = (rows: Array<{ year?: number; record?: string | null; placement?: string | null }>) =>
        [...rows]
          .filter((r) => plausibleSeason(Number(r.year)) && (r.record || r.placement))
          .sort((a, b) => Number(b.year) - Number(a.year))
          .map((r) => {
            const place = String(r.placement ?? "").trim()
            const record = String(r.record ?? "").trim()
            return [r.year, place && !/participat/i.test(place) ? place : null, record || null]
              .filter(Boolean)
              .join(" · ")
          })

      /**
       * Wins that mean something: over a nationally ranked wrestler, a ranked North Carolina
       * prospect, or somebody in the Tournament of Champions field. The same helper the scouting
       * report uses, so a win counts here exactly as it counts there.
       */
      const boutsForSignificance = withinRankingWindow([
        ...(currentSeasonBoutsByAthleteId.get(id) ?? []),
        ...(qualifierBoutsByAthleteId.get(id) ?? []),
      ]) as never

      const topSignificantWins = findSignificantWins(boutsForSignificance, opponentIndex).slice(0, 8)
      const significantWins = topSignificantWins.map(significantBoutRow)

      /**
       * Losses to the same calibre of opponent, shown beside the wins.
       *
       * A résumé is not a highlight reel, and a ranking argument is as much about who beat a
       * wrestler as who they beat: a one-point loss to the #1 in the country belongs on the card,
       * and without it a reviewer comparing two similar records is reading half the evidence.
       *
       * Shown, not scored. Everything here is a loss to somebody good, so subtracting for it
       * would penalise exactly the wrestlers who enter the hardest brackets — the opposite of
       * what the board is for. Whether a bad loss should cost points is a separate question from
       * whether a reviewer can see it.
       */
      const ownRanking = toNumber(athlete.prospect_ranking)
      const significantLosses = findSignificantLosses(boutsForSignificance, opponentIndex)
        .slice(0, 8)
        .map((loss) => ({
          ...significantBoutRow(loss),
          upset: isUpsetLoss(loss, ownRanking, gradYear),
        }))

      /**
       * An All-American finish, scored by how deep it went and how recent it is.
       *
       * A national title is worth far more than an eighth, and a finish two years ago says less
       * about a wrestler now than one last season — but it never counts for nothing, because it
       * happened.
       */
      const allAmericanScore = allAmericanRows.reduce((sum, row) => {
        const place = row.place!
        const depth = place === 1 ? 40 : place === 2 ? 32 : place <= 4 ? 26 : place <= 6 ? 20 : 15
        const seasonsAgo = gradYear == null ? 0 : Math.max(0, gradYear - row.year)
        const recency = seasonsAgo === 0 ? 1 : seasonsAgo === 1 ? 0.85 : 0.7
        return sum + depth * recency
      }, 0)

      /**
       * Beating a ranked wrestler, scored by who they were.
       *
       * A direct result is a measurement rather than an inference, which is why it sits second
       * only to a national placement. Capped so a wrestler who meets the same field twenty times
       * cannot out-score one who travelled.
       */
      const rankedWinScore = Math.min(
        topSignificantWins.reduce(
          (sum, win) =>
            sum +
            // Scored from `reason`, not from the rendered standing. This used to read the display
            // string, so relabelling a badge would have quietly rescored the class.
            (win.reason === "national-ranked"
              ? 18
              : win.reason === "toc-field"
                ? 10
                : 7),
          0,
        ),
        70,
      )

      /** Newest dated result across every source, formatted for a card. */
      const lastCompeted = (() => {
        const candidates: Array<{ at: number; label: string }> = []
        for (const bout of [
          ...(currentSeasonBoutsByAthleteId.get(id) ?? []),
          ...(qualifierBoutsByAthleteId.get(id) ?? []),
        ] as Array<{ date?: string | null; venue?: string | null; tournament?: string | null }>) {
          const at = bout.date ? Date.parse(String(bout.date)) : NaN
          if (!Number.isFinite(at)) continue
          candidates.push({ at, label: String(bout.venue ?? bout.tournament ?? "").trim() })
        }
        if (!candidates.length) {
          // No dated bout: fall back to the most recent tournament year on file.
          const years = [...(bundle.nchsaa ?? []), ...(bundle.nhsca ?? []), ...(bundle.super32 ?? []), ...(bundle.fargo ?? [])]
            .map((r) => Number((r as { year?: unknown }).year))
            .filter((y) => Number.isFinite(y) && plausibleSeason(y))
          return years.length ? String(Math.max(...years)) : null
        }
        candidates.sort((a, b) => b.at - a.at)
        const latest = candidates[0]!
        const when = new Date(latest.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        return latest.label ? `${latest.label} · ${when}` : when
      })()

      const scoreBreakdown: RankingScoreBreakdown = weighted({
        allAmerican: Math.round(allAmericanScore * 10) / 10,
        rankedWins: rankedWinScore,
        matchResume: matchScore.score,
        state,
        national,
        duals: dualsScore,
        rankWrestler,
        collegeOpen,
        profile,
      })
      const aiScore = Object.values(scoreBreakdown).reduce((sum, points) => sum + points, 0)
      const hasVerifiedResume = state > 0 || national > 0 || dualsScore > 0 || rankWrestler > 0 || headToHead.length > 0
      const confidence: RankingBoardAthlete["confidence"] =
        matchScore.totalMatches >= 20 && hasVerifiedResume
          ? "High"
          : matchScore.totalMatches > 0 || hasVerifiedResume
            ? "Medium"
            : "Low"

      return {
        id,
        name,
        highschool: (athlete.highschool as string) || null,
        graduationyear: (athlete.graduationyear as string | number) || null,
        gender: (athlete.gender as string) || null,
        weightclass: (athlete.weightclass as string | number) || (athlete.weight as string | number) || null,
        prospect_ranking: toNumber(athlete.prospect_ranking),
        previous_ranking: toNumber(athlete.previous_ranking),
        rankwrestler_rank: rankWrestlerRank,
        ai_rank: 999,
        ai_score: Math.round(aiScore * 10) / 10,
        confidence,
        confidence_reason:
          confidence === "High"
            ? "Deep match history plus verified tournament or direct-win evidence"
            : confidence === "Medium"
              ? "Some verified results, but the résumé is incomplete"
              : "Limited structured data; manual review required before publishing",
        score_breakdown: scoreBreakdown,
        evidence: evidence
          .sort((a, b) => evidencePriority(b) - evidencePriority(a))
          .slice(0, 12),
        data_gaps: dataGaps,
        head_to_head: headToHead,
        nchsaa_count: (bundle.nchsaa || []).length,
        national_count: nationalRows.length,
        match_count: matchScore.totalMatches,
        win_loss: matchScore.totalMatches > 0 ? `${matchScore.wins}-${matchScore.losses}` : null,
        college: (athlete.college as string) || null,
        college_opens_experience: (athlete.college_opens_experience as string) || null,
        achievements: athlete.achievements,
        additional_achievements: (athlete.additional_achievements as string) || null,
        all_american: allAmerican,
        last_competed: lastCompeted,
        state_placements: statePlacements,
        nhsca_record: latestRecord(bundle.nhsca || []),
        super32_record: latestRecord(bundle.super32 || []),
        nhsca_by_year: byYear(bundle.nhsca || []),
        super32_by_year: byYear(bundle.super32 || []),
        fargo_by_year: byYear(bundle.fargo || []),
        star_rating: isRatedAthlete({ gender: athlete.gender as string, graduationYear: toNumber(athlete.graduationyear) })
          ? applyStarOverride(
              rateAthlete({
                exposure: summarizeNationalExposure(nationalEventRows(bundle as never)),
                strength: summarizeSeasonStrength((currentSeasonBoutsByAthleteId.get(id) ?? []) as never),
                prospectRanking: toNumber(athlete.prospect_ranking),
                rankingPublished: true,
                statePlaces: statePlacesOf(bundle as never),
                nationallyRanked: nationallyRankedIds.has(id),
              }),
              starOverrideOf(athlete),
            )
          : null,
        significant_wins: significantWins,
        significant_losses: significantLosses,
      } satisfies RankingBoardAthlete
    },
  )

  return orderProspectsByHeadToHead(scored).map((athlete, index) => ({ ...athlete, ai_rank: index + 1 }))
}
