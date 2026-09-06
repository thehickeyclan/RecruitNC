import type { SupabaseClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { loadQualifierHeadToHead, type QualifierHeadToHeadIndex } from "@/lib/other-tournaments"
import { loadNcUnitedResultsForNameSearch } from "@/lib/national-team-live-profile-results"
import { placementPoints, recordWinPctPoints } from "@/lib/toc/athlete-compare"
import type { TocFieldBoard, TocFieldAthlete, TocSeedEvidence } from "@/lib/toc/field-board"
import type { TournamentResultForDisplay } from "@/lib/public-profile-data"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import { parseFargoStyle } from "@/lib/fargo-division"

type MatchBout = {
  date?: string
  weight?: string | number
  opponent?: string
  opponent_name?: string
  result?: string
  win_loss?: string
  method?: string
  tournament?: string
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

export type TocAiSeedRecommendation = {
  athleteId: string
  aiSeed: number
  aiSeedScore: number
  aiSeedConfidence: "High" | "Medium" | "Low"
  aiSeedReasons: string[]
  aiSeedWarnings: string[]
  seedEvidence: TocSeedEvidence
}

function parsePlacementNumber(raw: unknown): number | null {
  const s = String(raw ?? "").trim()
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower.includes("champion") && !lower.includes("2x")) return 1
  const m = s.match(/(\d+)/)
  if (!m) return null
  const n = Number.parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseBouts(value: unknown): MatchBout[] {
  if (!value) return []
  if (Array.isArray(value)) return value as MatchBout[]
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as MatchBout[]) : []
    } catch {
      return []
    }
  }
  return []
}

function didWinBout(bout: MatchBout): boolean {
  const result = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return result === "W" || result.startsWith("W ") || result.includes("WIN")
}

function didLoseBout(bout: MatchBout): boolean {
  const result = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return result === "L" || result.startsWith("L ") || result.includes("LOSS")
}

function isNchsaaStateBout(bout: MatchBout): boolean {
  return /nchsaa|state championship|state championships|state tournament|states/i.test(String(bout.tournament ?? ""))
}

function headToHeadRecordAgainst(bouts: MatchBout[], opponentName: string) {
  let wins = 0
  let losses = 0
  let nchsaaWins = 0
  let nchsaaLosses = 0

  for (const bout of bouts) {
    const opponent = String(bout.opponent_name ?? bout.opponent ?? "").trim()
    if (!opponent || !namesLikelySamePerson(opponent, opponentName)) continue
    const won = didWinBout(bout)
    const lost = didLoseBout(bout)
    if (!won && !lost) continue

    if (won) wins += 1
    if (lost) losses += 1
    if (isNchsaaStateBout(bout)) {
      if (won) nchsaaWins += 1
      if (lost) nchsaaLosses += 1
    }
  }

  return { wins, losses, nchsaaWins, nchsaaLosses }
}

function achievementText(row: Record<string, unknown>): string {
  return [
    row.achievements,
    row.additional_achievements,
    row.nationally_ranked_wins,
    row.college_opens_experience,
  ]
    .map((v) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(" ") : v ? JSON.stringify(v) : ""))
    .join(" ")
}

async function loadMatchRows(supabase: SupabaseClient, athleteIds: string[]): Promise<Map<string, MatchRow[]>> {
  const out = new Map<string, MatchRow[]>()
  if (!athleteIds.length) return out

  const { data, error } = await supabase
    .from("matches")
    .select("athlete_id,season,total_matches,wins,losses,matches")
    .in("athlete_id", athleteIds)

  if (error || !data) return out
  for (const row of data as MatchRow[]) {
    const athleteId = row.athlete_id
    if (!athleteId) continue
    out.set(athleteId, [...(out.get(athleteId) || []), row])
  }
  return out
}

/**
 * Only the most recent season's rows.
 *
 * Head-to-head is a seeding argument about who is beating whom *now*. A result from two seasons ago, at a
 * different weight and a different stage of development, is not evidence about this bracket — and stale wins
 * were outranking current ones. Season values are "2024-25" strings, so a lexical max picks the latest.
 *
 * Career totals deliberately still use every row; this narrows head-to-head only.
 */
export function latestSeasonMatchRows(rows: MatchRow[]): MatchRow[] {
  const seasons = rows.map((r) => String(r.season ?? "").trim()).filter(Boolean)
  if (seasons.length === 0) return rows
  const latest = seasons.reduce((a, b) => (b > a ? b : a))
  return rows.filter((r) => String(r.season ?? "").trim() === latest)
}

function scoreMatchRows(rows: MatchRow[]) {
  let score = 0
  let totalMatches = 0
  let wins = 0
  let losses = 0
  const bouts: MatchBout[] = []
  let qualityWins = 0
  let qualityWinPoints = 0

  for (const row of rows) {
    totalMatches += Number(row.total_matches || 0)
    wins += Number(row.wins || 0)
    losses += Number(row.losses || 0)
    for (const bout of parseBouts(row.matches)) {
      bouts.push(bout)
      const won = String(bout.win_loss || bout.result || "").toUpperCase().startsWith("W")
      const oppPct = toNumber(bout.opponent_percentage)
      if (won && oppPct && oppPct >= 95) {
        qualityWins += 1
        qualityWinPoints += oppPct >= 98 ? 8 : 5
      }
    }
  }

  // Match imports vary widely in depth. Quality wins matter, but an athlete with a
  // deeper imported history must not bury state and national tournament credentials.
  score += Math.min(qualityWinPoints, 30)

  if (totalMatches > 0) {
    const pct = wins / Math.max(totalMatches, 1)
    score += Math.round(pct * 18)
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
    bouts,
  }
}

function findFieldHeadToHeadBonus(
  athlete: TocFieldAthlete,
  field: TocFieldAthlete[],
  boutsByAthleteId: Map<string, MatchBout[]>,
  qualifierHeadToHead?: QualifierHeadToHeadIndex,
): { points: number; wins: number; losses: number; opponents: TocSeedEvidence["headToHead"] } {
  let wins = 0
  let losses = 0
  const opponents: TocSeedEvidence["headToHead"] = []
  const athleteBouts = boutsByAthleteId.get(athlete.athleteId) ?? []
  const qualifierSide = qualifierHeadToHead?.get(athlete.athleteId)

  for (const opponent of field) {
    if (opponent.athleteId === athlete.athleteId) continue
    const athleteSide = headToHeadRecordAgainst(athleteBouts, opponent.name)
    const opponentSide = headToHeadRecordAgainst(boutsByAthleteId.get(opponent.athleteId) ?? [], athlete.name)

    // Qualifier bouts are matched by athlete id, so this pairing is exact rather than
    // inferred from an opponent name typed into a match import.
    const qualifier = qualifierSide?.get(opponent.athleteId)

    // A meeting may be stored on one wrestler, on both, and again in qualifier data.
    // max() across every source captures mirrored copies without counting one bout twice.
    const pairWins = Math.max(athleteSide.wins, opponentSide.losses, qualifier?.wins ?? 0)
    const pairLosses = Math.max(athleteSide.losses, opponentSide.wins, qualifier?.losses ?? 0)
    if (pairWins === 0 && pairLosses === 0) continue
    wins += pairWins
    losses += pairLosses
    opponents.push({
      opponent: opponent.name,
      wins: pairWins,
      losses: pairLosses,
      ...(qualifier ? { viaQualifier: true, note: qualifier.summary } : {}),
    })
  }
  return { points: wins * 50 - losses * 35, wins, losses, opponents }
}

function ordinal(place: number): string {
  const mod100 = place % 100
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`
  if (place % 10 === 1) return `${place}st`
  if (place % 10 === 2) return `${place}nd`
  if (place % 10 === 3) return `${place}rd`
  return `${place}th`
}

function formatNationalEvidence(rows: TournamentResultForDisplay[]): string[] {
  return [...rows]
    .sort((a, b) => b.year - a.year)
    .slice(0, 4)
    .map((row) => {
      const details = [row.placement?.trim(), row.record?.trim() ? `${row.record} record` : "", row.weight?.trim()]
        .filter(Boolean)
        .join(" · ")
      return `${row.year}${details ? ` — ${details}` : ""}`
    })
}

export function filterFargoFreestyleResults(rows: TournamentResultForDisplay[]): TournamentResultForDisplay[] {
  return rows.filter((row) => parseFargoStyle(row.division) === "FS")
}

function recordTotals(rows: TournamentResultForDisplay[]): { wins: number; losses: number } {
  let wins = 0
  let losses = 0
  for (const row of rows) {
    const match = String(row.record ?? "").match(/^(\d+)\s*-\s*(\d+)$/)
    if (!match) continue
    wins += Number(match[1])
    losses += Number(match[2])
  }
  return { wins, losses }
}

function classificationStrengthPoints(classification: string): number {
  const match = String(classification ?? "").toUpperCase().match(/(\d+)A/)
  const divisions = match ? Number(match[1]) : 0
  return divisions >= 8 ? 25 : divisions === 7 ? 20 : divisions === 6 ? 10 : divisions === 5 ? 6 : divisions === 4 ? 3 : divisions === 3 ? 1 : 0
}

/**
 * Seed state credentials by top-end finish first, then résumé depth.
 * Repeating the athlete's best finish keeps full value; lower secondary finishes
 * receive diminishing weight. The strongest classification attached to a best
 * finish breaks otherwise similar state résumés.
 */
export function scoreNchsaaRowsForSeed(rows: NchsaaRowForProfile[]): number {
  const placers = rows.filter((row) => Number(row.place) > 0)
  if (!placers.length) return 0

  const bestPlace = Math.min(...placers.map((row) => Number(row.place)))
  const bestRows = placers.filter((row) => Number(row.place) === bestPlace)
  const lesserRows = placers
    .filter((row) => Number(row.place) !== bestPlace)
    .sort((a, b) => Number(a.place) - Number(b.place) || b.year - a.year)

  let points = bestRows.reduce((sum, row) => sum + placementPoints(Number(row.place)), 0)
  lesserRows.forEach((row, index) => {
    points += placementPoints(Number(row.place)) * (index === 0 ? 0.5 : 0.25)
  })
  points += Math.max(...bestRows.map((row) => classificationStrengthPoints(row.classification)))
  points += bestRows.filter((row) => row.place === 1).length * 8
  return Math.round(points * 10) / 10
}

/**
 * How far a direct win may reach.
 *
 * Set by experiment on the real field, not picked. At 20 it did nothing: one state title is worth
 * forty-eight, so any champion-over-placer pairing overrode the result. With no limit at all,
 * Kristopher Kerr Jr — 1-4 against this field — held Liam Myles, a two-time state champion with
 * the second-best résumé at 117, down to last on a single win, and sent Myles into a first-round
 * meeting with the top seed. Fifty is about one state title: wide enough to carry every result
 * worth carrying at 125, 149 and 174, narrow enough that one upset does not invert a bracket.
 */
export const HEAD_TO_HEAD_MAX_GAP = 50

/**
 * Seed order: a direct win outranks a résumé, and everything else falls to résumé score.
 *
 * Exported so the rule can be tested. It decides the seeds, and a rule that decides seeds should
 * not live only inside a function nobody can call.
 */
export function orderByHeadToHeadThenResume<T extends {
  athlete: TocFieldAthlete
  score: number
  evidence: TocSeedEvidence
}>(rows: T[]): T[] {
  const remaining = [...rows]
  const ordered: T[] = []

  while (remaining.length > 0) {
    const eligible = remaining.filter((candidate) =>
      !remaining.some((other) => {
        if (other.athlete.athleteId === candidate.athlete.athleteId) return false
        const record = other.evidence.headToHead.find((h2h) => namesLikelySamePerson(h2h.opponent, candidate.athlete.name))
        // A direct win holds, whatever the résumé says. This used to give way when the loser's
        // résumé was more than twenty points stronger, which sounds narrow and is not: one state
        // title is worth forty-eight, so any champion-over-placer pairing overrode the result
        // automatically. Aiden Burkholder sat above Adam Walker on two NCHSAA titles having lost
        // to him this season, while RecruitNC ranked Walker #4 and Burkholder #22.
        //
        // Head-to-head here is current-season only (see latestSeasonMatchRows), so this is a live
        // result between two wrestlers in the same bracket — the most direct evidence there is.
        return Boolean(record && record.wins > record.losses && other.score >= candidate.score - HEAD_TO_HEAD_MAX_GAP)
      }),
    )

    // A circular series (A beat B, B beat C, C beat A) has no eligible wrestler.
    // Break only that cycle by résumé score; otherwise every direct winner stays above the loser.
    const pool = eligible.length > 0 ? eligible : remaining
    pool.sort((a, b) => b.score - a.score || a.athlete.name.localeCompare(b.athlete.name))
    const next = pool[0]
    ordered.push(next)
    remaining.splice(remaining.indexOf(next), 1)
  }

  return ordered
}

/** Qualifier results seed a TOC bracket, but weigh less than the national events they feed. */
const TOC_QUALIFIER_WEIGHT = 0.6

async function scoreAthleteForTocSeed({
  supabase,
  athlete,
  athleteRow,
  fieldHeadToHead,
  matchRows,
}: {
  supabase: SupabaseClient
  athlete: TocFieldAthlete
  athleteRow: Record<string, unknown> | undefined
  fieldHeadToHead: ReturnType<typeof findFieldHeadToHeadBonus>
  matchRows: MatchRow[]
}) {
  const reasons: string[] = []
  const warnings: string[] = []
  const evidence: TocSeedEvidence = {
    nchsaa: [],
    nhsca: [],
    super32: [],
    fargo: [],
    other: [],
    headToHead: [],
    summary: {
      stateTitles: 0,
      statePlacements: 0,
      nhscaAllAmericanFinishes: 0,
      fargoAllAmericanFinishes: 0,
      nhscaWins: 0,
      nhscaLosses: 0,
      super32Wins: 0,
      super32Losses: 0,
      fargoWins: 0,
      fargoLosses: 0,
    },
  }
  let score = 0

  const matchScore = scoreMatchRows(matchRows)
  score += matchScore.score
  if (matchScore.totalMatches > 0) reasons.push(`${matchScore.wins}-${matchScore.losses} profile match record`)
  else warnings.push("No match history on file")
  if (matchScore.qualityWins > 0) reasons.push(`${matchScore.qualityWins} quality match win${matchScore.qualityWins === 1 ? "" : "s"}`)
  if (matchScore.totalMatches > 0 && matchScore.totalMatches < 20) warnings.push(`Thin match history (${matchScore.totalMatches} bouts)`)

  const h2h = fieldHeadToHead
  evidence.headToHead = h2h.opponents
  // Head-to-head is enforced by orderByHeadToHeadThenResume below. Do not also
  // add or subtract résumé points here: doing both penalized a wrestler twice
  // for losing to the clear No. 1 and could bury an otherwise top-four résumé.
  if (h2h.wins || h2h.losses) reasons.push(`Field head-to-head: ${h2h.wins}-${h2h.losses}`)

  if (athleteRow) {
    const ranking = toNumber(athleteRow.prospect_ranking)
    if (ranking != null) {
      const rankPoints = ranking <= 1 ? 32 : ranking <= 3 ? 28 : ranking <= 5 ? 24 : ranking <= 10 ? 18 : ranking <= 20 ? 10 : 5
      score += rankPoints
      reasons.push(`RecruitNC ranking #${ranking}`)
    }

    const [bundle, duals] = await Promise.all([
      loadAthleteTournamentBundle(supabase, athleteRow, { nhscaAllTime: true }).catch(() => ({
        nchsaa: [],
        nhsca: [],
        super32: [],
        fargo: [],
        other: [],
      })),
      loadNcUnitedResultsForNameSearch(supabase, athlete.name, {
        athleteId: athlete.athleteId,
        highSchool: athlete.school,
        gradYear: athlete.graduationYear,
        athleteRow,
      }).catch(() => []),
    ])

    evidence.nchsaa = [...(bundle.nchsaa || [])]
      .sort((a, b) => b.year - a.year)
      .slice(0, 4)
      .map((row) => {
        const result = row.place != null && row.place > 0 ? ordinal(row.place) : "State qualifier"
        return `${row.year} ${row.classification} · ${row.weight_class} · ${result}`
      })
    evidence.nhsca = formatNationalEvidence(bundle.nhsca || [])
    evidence.super32 = formatNationalEvidence(bundle.super32 || [])
    const freestyleFargo = filterFargoFreestyleResults(bundle.fargo || [])
    evidence.fargo = formatNationalEvidence(freestyleFargo)
    const nhscaRecord = recordTotals(bundle.nhsca || [])
    const super32Record = recordTotals(bundle.super32 || [])
    const fargoRecord = recordTotals(freestyleFargo)
    evidence.summary = {
      stateTitles: (bundle.nchsaa || []).filter((row) => row.place === 1).length,
      statePlacements: (bundle.nchsaa || []).filter((row) => row.place != null && row.place > 0).length,
      nhscaAllAmericanFinishes: (bundle.nhsca || []).filter((row) => {
        const place = parsePlacementNumber(row.placement)
        return place != null && place <= 8
      }).length,
      fargoAllAmericanFinishes: freestyleFargo.filter((row) => {
        const place = parsePlacementNumber(row.placement)
        return place != null && place <= 8
      }).length,
      nhscaWins: nhscaRecord.wins,
      nhscaLosses: nhscaRecord.losses,
      super32Wins: super32Record.wins,
      super32Losses: super32Record.losses,
      fargoWins: fargoRecord.wins,
      fargoLosses: fargoRecord.losses,
    }

    score += scoreNchsaaRowsForSeed(bundle.nchsaa || [])
    const statePlacers = (bundle.nchsaa || []).filter((r) => Number(r.place) > 0)
    if (statePlacers.length) {
      const titles = statePlacers.filter((r) => r.place === 1).length
      const best = Math.min(...statePlacers.map((r) => Number(r.place)).filter(Number.isFinite))
      reasons.push(titles > 0 ? `${titles} NCHSAA title${titles === 1 ? "" : "s"}` : `NCHSAA best finish ${best}`)
    } else {
      warnings.push("No merged NCHSAA placement")
    }

    const nationalRows = [...(bundle.nhsca || []), ...(bundle.super32 || []), ...freestyleFargo]
    let nationalPoints = 0
    for (const row of nationalRows) {
      const place = parsePlacementNumber(row.placement)
      nationalPoints += placementPoints(place)
      nationalPoints += recordWinPctPoints(row.record)
    }
    score += nationalPoints
    if (nationalRows.length) reasons.push(`${nationalRows.length} national result${nationalRows.length === 1 ? "" : "s"} on file`)
    else warnings.push("No NHSCA/Super32/Fargo result on file")

    // Qualifiers (Super 32 Early Entry and the rest of that series). Seeding-relevant and
    // recent, but discounted against the national tournaments they feed into.
    const otherRows = bundle.other || []
    evidence.other = otherRows.map((row) => {
      const finish = row.placement ? ordinal(row.placement) : "did not place"
      return `${row.year} ${row.eventShortName} · ${row.weight} · ${finish}${row.record ? ` · ${row.record}` : ""}`
    })
    let qualifierPoints = 0
    for (const row of otherRows) {
      qualifierPoints += (placementPoints(row.placement) + recordWinPctPoints(row.record)) * TOC_QUALIFIER_WEIGHT
    }
    score += Math.round(qualifierPoints)
    const qualified = otherRows.filter((row) => row.qualified)
    if (qualified.length) {
      reasons.push(`Super 32 qualifier finish at ${qualified.map((row) => row.eventShortName).join(", ")}`)
    } else if (otherRows.length) {
      reasons.push(`${otherRows.length} qualifier result${otherRows.length === 1 ? "" : "s"} on file`)
    }

    const dualsPoints = duals.reduce((sum, row) => sum + recordWinPctPoints(row.record) * 2, 0)
    score += dualsPoints
    if (duals.length) reasons.push(`${duals.length} NC United/NHSCA Duals record${duals.length === 1 ? "" : "s"}`)

    const profileText = achievementText(athleteRow)
    if (/all[- ]?american|national champion|fargo|super\s*32|beast|ironman|powerade|4x|four[- ]time/i.test(profileText)) {
      score += 10
      reasons.push("Elite achievement signal in profile")
    }
    if (/college\s+open|open tournament|unc open|app state open|wolfpack open|mount olive open|roanoke open/i.test(profileText)) {
      score += 8
      reasons.push("College open experience")
    }
  } else {
    warnings.push("Athlete profile row unavailable")
  }

  const confidence: TocAiSeedRecommendation["aiSeedConfidence"] =
    matchScore.totalMatches >= 20 && reasons.some((r) => /NCHSAA|national|RecruitNC|head-to-head/i.test(r))
      ? "High"
      : matchScore.totalMatches > 0 || reasons.length >= 2
        ? "Medium"
        : "Low"

  return {
    athleteId: athlete.athleteId,
    score: Math.round(score * 10) / 10,
    confidence,
    reasons: reasons.slice(0, 5),
    warnings: warnings.slice(0, 4),
    evidence,
  }
}

export async function buildTocAiSeedRecommendations({
  supabase,
  board,
  athleteRowsById,
}: {
  supabase: SupabaseClient
  board: TocFieldBoard
  athleteRowsById: Map<string, Record<string, unknown>>
}): Promise<Map<string, TocAiSeedRecommendation>> {
  const athleteIds = [...new Set(board.weights.flatMap((w) => w.athletes.map((a) => a.athleteId)).filter(Boolean))]
  const [matchRowsByAthlete, qualifierHeadToHead] = await Promise.all([
    loadMatchRows(supabase, athleteIds),
    // Qualifier meetings are current-season bouts between kids in this field, so they
    // belong in head-to-head — not only in the résumé score.
    loadQualifierHeadToHead(supabase, athleteIds).catch(() => new Map() as QualifierHeadToHeadIndex),
  ])
  const out = new Map<string, TocAiSeedRecommendation>()

  for (const weight of board.weights) {
    const confirmed = weight.athletes.filter((a) => a.status === "confirmed")
    if (!confirmed.length) continue
    const boutsByAthleteId = new Map(
      confirmed.map((athlete) => [
        athlete.athleteId,
        // Head-to-head is current-season only; see latestSeasonMatchRows.
        scoreMatchRows(latestSeasonMatchRows(matchRowsByAthlete.get(athlete.athleteId) || [])).bouts,
      ]),
    )

    const scored = await Promise.all(
      confirmed.map(async (athlete) => {
        const scoredAthlete = await scoreAthleteForTocSeed({
          supabase,
          athlete,
          athleteRow: athleteRowsById.get(athlete.athleteId),
          fieldHeadToHead: findFieldHeadToHeadBonus(athlete, confirmed, boutsByAthleteId, qualifierHeadToHead),
          matchRows: matchRowsByAthlete.get(athlete.athleteId) || [],
        })
        return { athlete, ...scoredAthlete }
      }),
    )

    orderByHeadToHeadThenResume(scored)
      .forEach((row, index) => {
        out.set(row.athleteId, {
          athleteId: row.athleteId,
          aiSeed: index + 1,
          aiSeedScore: row.score,
          aiSeedConfidence: row.confidence,
          aiSeedReasons: row.reasons,
          aiSeedWarnings: row.warnings,
          seedEvidence: row.evidence,
        })
      })
  }

  return out
}

export function applyTocAiSeedRecommendations(
  board: TocFieldBoard,
  recommendations: Map<string, TocAiSeedRecommendation>,
): TocFieldBoard {
  return {
    ...board,
    weights: board.weights.map((weight) => ({
      ...weight,
      athletes: weight.athletes.map((athlete) => {
        const recommendation = recommendations.get(athlete.athleteId)
        return recommendation
          ? {
              ...athlete,
              aiSeed: recommendation.aiSeed,
              aiSeedScore: recommendation.aiSeedScore,
              aiSeedConfidence: recommendation.aiSeedConfidence,
              aiSeedReasons: recommendation.aiSeedReasons,
              aiSeedWarnings: recommendation.aiSeedWarnings,
              seedEvidence: recommendation.seedEvidence,
            }
          : athlete
      }),
    })),
  }
}
