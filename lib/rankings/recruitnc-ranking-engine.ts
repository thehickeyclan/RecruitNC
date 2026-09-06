import type { SupabaseClient } from "@supabase/supabase-js"
import { getAthleteNameSearchVariants, namesLikelySamePerson } from "@/lib/athlete-name-match"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import {
  buildNhscaDuals2026LiveProfileResults,
  mergeNationalTeamResultsForProfile,
  type ProfileNationalTeamResult,
} from "@/lib/national-team-live-profile-results"
import { fetchNhscaDualsSnapshot } from "@/lib/nhsca-duals-live-results/db"
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

  score += Math.min(qualityWinPoints, 30)
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

function headToHeadRecordAgainst(bouts: MatchBout[], opponentName: string): { wins: number; losses: number } {
  let wins = 0
  let losses = 0
  for (const bout of bouts) {
    const opponent = String(bout.opponent_name ?? bout.opponent ?? "").trim()
    if (!opponent || !namesLikelySamePerson(opponent, opponentName)) continue
    if (didWinBout(bout)) wins += 1
    else if (didLoseBout(bout)) losses += 1
  }
  return { wins, losses }
}

export function buildCandidateHeadToHead(
  athlete: CandidateIdentity,
  candidates: CandidateIdentity[],
  currentSeasonBoutsByAthleteId: Map<string, MatchBout[]>,
): RankingHeadToHead[] {
  const records: RankingHeadToHead[] = []
  const athleteBouts = currentSeasonBoutsByAthleteId.get(athlete.id) ?? []

  for (const opponent of candidates) {
    if (opponent.id === athlete.id) continue
    const athleteSide = headToHeadRecordAgainst(athleteBouts, opponent.name)
    const opponentSide = headToHeadRecordAgainst(currentSeasonBoutsByAthleteId.get(opponent.id) ?? [], athlete.name)
    const wins = Math.max(athleteSide.wins, opponentSide.losses)
    const losses = Math.max(athleteSide.losses, opponentSide.wins)
    if (!wins && !losses) continue
    records.push({ opponentId: opponent.id, opponent: opponent.name, wins, losses })
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
          record && record.wins > record.losses && other.ai_score >= candidate.ai_score - HEAD_TO_HEAD_MAX_GAP,
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
    .order("prospect_ranking", { ascending: true })
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)

  const athleteRows = (athletes || []) as Array<Record<string, unknown>>
  const athleteIds = athleteRows.map((athlete) => String(athlete.id)).filter(Boolean)
  const [matchRowsByAthlete, dualsByAthlete] = await Promise.all([
    fetchMatchRows(supabase, athleteIds),
    loadRankingDualsByAthlete(supabase, athleteRows),
  ])
  const candidates: CandidateIdentity[] = athleteRows.map((athlete) => ({
    id: String(athlete.id),
    name: String(athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`).trim(),
  }))
  const currentSeasonBoutsByAthleteId = new Map(
    athleteIds.map((athleteId) => [
      athleteId,
      latestProspectMatchRows(matchRowsByAthlete.get(athleteId) || []).flatMap((row) => parseBouts(row.matches)),
    ]),
  )

  const scored = await Promise.all(
    athleteRows.map(async (athlete) => {
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

      const headToHead = buildCandidateHeadToHead({ id, name }, candidates, currentSeasonBoutsByAthleteId)
      const headToHeadWins = headToHead.reduce((sum, record) => sum + record.wins, 0)
      const headToHeadLosses = headToHead.reduce((sum, record) => sum + record.losses, 0)
      if (headToHeadWins || headToHeadLosses) {
        evidence.push({
          kind: "head_to_head",
          label: `Current-season same-class head-to-head: ${headToHeadWins}-${headToHeadLosses}`,
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

      const rankWrestlerRank = toNumber(athlete.rankwrestler_rank || athlete.rank_wrestler_rank || athlete.rw_rank)
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

      const scoreBreakdown: RankingScoreBreakdown = {
        matchResume: matchScore.score,
        state,
        national,
        duals: dualsScore,
        rankWrestler,
        collegeOpen,
        profile,
      }
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
      } satisfies RankingBoardAthlete
    }),
  )

  return orderProspectsByHeadToHead(scored).map((athlete, index) => ({ ...athlete, ai_rank: index + 1 }))
}
