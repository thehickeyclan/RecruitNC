import type { SupabaseClient } from "@supabase/supabase-js"
import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"

type EvidenceKind = "head_to_head" | "national" | "state" | "college_open" | "achievement" | "rankwrestler" | "data_gap"

export type RankingEvidence = {
  kind: EvidenceKind
  label: string
  points?: number
  tone?: "gold" | "blue" | "purple" | "green" | "orange" | "red" | "slate"
}

export type RankingScoreBreakdown = {
  directWins: number
  national: number
  state: number
  collegeOpen: number
  schedule: number
  profile: number
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
  nchsaa_count: number
  national_count: number
  match_count: number
  win_loss?: string | null
  college?: string | null
  college_opens_experience?: string | null
  achievements?: unknown
  additional_achievements?: string | null
}

type MatchRow = {
  athlete_id?: string | null
  total_matches?: number | null
  wins?: number | null
  losses?: number | null
  matches?: Array<{
    opponent?: string
    opponent_name?: string
    opponent_school?: string
    result?: string
    method?: string
    venue?: string
    tournament?: string
    win_loss?: string
    opponent_percentage?: string | number | null
  }> | null
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
  if (value == null) return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  const text = String(value).toLowerCase()
  if (/champ|winner|1st|\b1\b/.test(text)) return 1
  const match = text.match(/\b([1-8])(?:st|nd|rd|th)?\b/)
  return match ? Number.parseInt(match[1], 10) : null
}

function parseRecordWins(value: unknown): number {
  if (!value) return 0
  const match = String(value).match(/\b(\d+)\s*[-–]\s*(\d+)\b/)
  return match ? Number.parseInt(match[1], 10) : 0
}

function addCapped(score: number, cap: number): number {
  return Math.min(score, cap)
}

function pointsForPlacement(place: number, champion: number, finalist: number, aa: number): number {
  if (place === 1) return champion
  if (place <= 3) return finalist
  if (place <= 8) return aa
  return 0
}

function evidenceToneForPlace(place: number): RankingEvidence["tone"] {
  if (place === 1) return "gold"
  if (place <= 3) return "blue"
  return "purple"
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
    .map((v) => (typeof v === "string" ? v : Array.isArray(v) ? v.join(" ") : v ? JSON.stringify(v) : ""))
    .join(" ")
}

function scoreLegacyTournamentColumns(athlete: Record<string, unknown>, evidence: RankingEvidence[]) {
  let national = 0
  for (const year of [2023, 2024, 2025, 2026]) {
    const nhscaPlace = placementNumber(athlete[`nhsca_${year}_placement`])
    const nhscaRecord = athlete[`nhsca_${year}_record`]
    if (nhscaPlace) {
      const points = pointsForPlacement(nhscaPlace, 18, 14, 10)
      national += points
      evidence.push({
        kind: "national",
        label: `NHSCA ${year}: ${nhscaPlace === 1 ? "Champion" : `${nhscaPlace}th`}`,
        points,
        tone: evidenceToneForPlace(nhscaPlace),
      })
    } else {
      const wins = parseRecordWins(nhscaRecord)
      if (wins >= 3) {
        national += 5
        evidence.push({ kind: "national", label: `NHSCA ${year}: ${wins} wins`, points: 5, tone: "blue" })
      }
    }

    const super32Place = placementNumber(athlete[`super_32_${year}_placement`])
    const super32Record = athlete[`super_32_${year}_record`]
    if (super32Place) {
      const points = pointsForPlacement(super32Place, 22, 17, 13)
      national += points
      evidence.push({
        kind: "national",
        label: `Super32 ${year}: ${super32Place === 1 ? "Champion" : `${super32Place}th`}`,
        points,
        tone: "purple",
      })
    } else {
      const wins = parseRecordWins(super32Record)
      if (wins >= 3) {
        national += 7
        evidence.push({ kind: "national", label: `Super32 ${year}: ${wins} wins`, points: 7, tone: "purple" })
      }
    }
  }
  return national
}

async function fetchMatchRows(supabase: SupabaseClient, athleteIds: string[]): Promise<Map<string, MatchRow[]>> {
  const byAthlete = new Map<string, MatchRow[]>()
  if (!athleteIds.length) return byAthlete

  const { data, error } = await supabase
    .from("matches")
    .select("athlete_id,total_matches,wins,losses,matches")
    .in("athlete_id", athleteIds)

  if (error || !data) return byAthlete
  for (const row of data as MatchRow[]) {
    const athleteId = row.athlete_id
    if (!athleteId) continue
    byAthlete.set(athleteId, [...(byAthlete.get(athleteId) || []), row])
  }
  return byAthlete
}

function scoreMatches(rows: MatchRow[], evidence: RankingEvidence[]) {
  let directWins = 0
  let schedule = 0
  let totalMatches = 0
  let wins = 0
  let losses = 0
  let qualityWins = 0

  for (const row of rows) {
    totalMatches += Number(row.total_matches || 0)
    wins += Number(row.wins || 0)
    losses += Number(row.losses || 0)
    for (const match of row.matches || []) {
      const won = String(match.win_loss || match.result || "").toUpperCase().startsWith("W")
      const oppPct = toNumber(match.opponent_percentage)
      if (oppPct && oppPct >= 97) schedule += 1.5
      else if (oppPct && oppPct >= 93) schedule += 0.75
      if (won && oppPct && oppPct >= 95) {
        qualityWins += 1
        directWins += oppPct >= 98 ? 5 : 3
        const opponent = match.opponent || match.opponent_name || "quality opponent"
        evidence.push({
          kind: "head_to_head",
          label: `Quality win over ${opponent}${oppPct ? ` (${oppPct}%)` : ""}`,
          points: oppPct >= 98 ? 5 : 3,
          tone: "green",
        })
      }
    }
  }

  if (totalMatches > 0) {
    const winPct = wins / Math.max(totalMatches, 1)
    if (winPct >= 0.85) directWins += 5
    else if (winPct >= 0.75) directWins += 3
    evidence.push({
      kind: "head_to_head",
      label: `${wins}-${losses} profile match record`,
      points: Math.round(Math.max(0, winPct) * 5),
      tone: "green",
    })
  }

  return {
    directWins: addCapped(directWins, 30),
    schedule: addCapped(schedule + qualityWins, 10),
    totalMatches,
    winLoss: totalMatches > 0 ? `${wins}-${losses}` : null,
  }
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
    .order("prospect_ranking", { ascending: true, nullsLast: true })
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)

  const athleteRows = (athletes || []) as Array<Record<string, unknown>>
  const matchRowsByAthlete = await fetchMatchRows(
    supabase,
    athleteRows.map((a) => String(a.id)).filter(Boolean),
  )

  const scored = await Promise.all(
    athleteRows.map(async (athlete) => {
      const evidence: RankingEvidence[] = []
      const dataGaps: string[] = []

      const bundle = await loadAthleteTournamentBundle(supabase, athlete, { nhscaAllTime: true }).catch(() => ({
        nchsaa: [],
        nhsca: [],
        super32: [],
        fargo: [],
      }))

      let state = 0
      for (const result of bundle.nchsaa || []) {
        const place = Number(result.place)
        if (!Number.isFinite(place)) continue
        const cls = String(result.classification || "")
        const classMultiplier = cls === "4A" ? 1 : cls === "3A" ? 0.92 : cls === "2A" ? 0.84 : cls === "1A" ? 0.78 : 0.86
        const base = place === 1 ? 16 : place <= 3 ? 11 : place <= 6 ? 7 : 4
        const points = Math.round(base * classMultiplier)
        state += points
        evidence.push({
          kind: "state",
          label: `${result.year} NCHSAA ${cls} ${place === 1 ? "Champion" : `${place}${place === 2 ? "nd" : place === 3 ? "rd" : "th"}`}`,
          points,
          tone: place === 1 ? "gold" : "orange",
        })
      }

      let national = scoreLegacyTournamentColumns(athlete, evidence)
      for (const result of [...(bundle.nhsca || []), ...(bundle.super32 || []), ...(bundle.fargo || [])]) {
        const place = placementNumber(result.placement)
        const wins = parseRecordWins(result.record)
        const labelEvent = (bundle.super32 || []).includes(result)
          ? "Super32"
          : (bundle.fargo || []).includes(result)
            ? "Fargo"
            : "NHSCA"
        if (place) {
          const points = labelEvent === "Super32" ? pointsForPlacement(place, 22, 17, 13) : pointsForPlacement(place, 18, 14, 10)
          national += points
          evidence.push({
            kind: "national",
            label: `${result.year || ""} ${labelEvent}: ${place === 1 ? "Champion" : `${place}th`}`.trim(),
            points,
            tone: labelEvent === "Super32" ? "purple" : evidenceToneForPlace(place),
          })
        } else if (wins >= 3) {
          const points = labelEvent === "Super32" ? 7 : 5
          national += points
          evidence.push({
            kind: "national",
            label: `${result.year || ""} ${labelEvent}: ${wins} wins`.trim(),
            points,
            tone: labelEvent === "Super32" ? "purple" : "blue",
          })
        }
      }

      const matchScore = scoreMatches(matchRowsByAthlete.get(String(athlete.id)) || [], evidence)

      const profileText = achievementText(athlete)
      let collegeOpen = 0
      if (athlete.college_opens_experience || textHasCollegeOpenSignal(profileText)) {
        collegeOpen = 10
        evidence.push({
          kind: "college_open",
          label: "College open experience listed",
          points: 10,
          tone: "green",
        })
      }

      let profile = 0
      if (/all[- ]?american|national champion|fargo|super\s*32|beast|ironman|powerade|4x|four[- ]time/i.test(profileText)) {
        profile += 4
        evidence.push({ kind: "achievement", label: "Profile achievements include elite/national signal", points: 4, tone: "slate" })
      }
      if (athlete.college) {
        profile += 1
        evidence.push({ kind: "achievement", label: `College commit: ${athlete.college}`, points: 1, tone: "blue" })
      }

      if (!(bundle.nchsaa || []).length) dataGaps.push("No merged NCHSAA state result")
      if (!(bundle.nhsca || []).length && !profileText.match(/nhsca/i)) dataGaps.push("No NHSCA table/profile signal")
      if (!matchScore.totalMatches) dataGaps.push("No profile match history")
      if (!athlete.college_opens_experience) dataGaps.push("No college open detail")

      for (const gap of dataGaps.slice(0, 3)) {
        evidence.push({ kind: "data_gap", label: gap, tone: "red" })
      }

      const scoreBreakdown: RankingScoreBreakdown = {
        directWins: matchScore.directWins,
        national: addCapped(national, 25),
        state: addCapped(state, 20),
        collegeOpen: addCapped(collegeOpen, 10),
        schedule: addCapped(matchScore.schedule, 10),
        profile: addCapped(profile, 5),
      }
      const aiScore = Object.values(scoreBreakdown).reduce((sum, n) => sum + n, 0)
      const confidence =
        matchScore.totalMatches >= 20 && ((bundle.nchsaa || []).length > 0 || (bundle.nhsca || []).length > 0)
          ? "High"
          : matchScore.totalMatches > 0 || (bundle.nchsaa || []).length > 0 || (bundle.nhsca || []).length > 0
            ? "Medium"
            : "Low"

      return {
        id: String(athlete.id),
        name: String(athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`).trim(),
        highschool: (athlete.highschool as string) || null,
        graduationyear: (athlete.graduationyear as string | number) || null,
        gender: (athlete.gender as string) || null,
        weightclass: (athlete.weightclass as string | number) || (athlete.weight as string | number) || null,
        prospect_ranking: toNumber(athlete.prospect_ranking),
        previous_ranking: toNumber(athlete.previous_ranking),
        rankwrestler_rank: toNumber(athlete.rankwrestler_rank || athlete.rank_wrestler_rank || athlete.rw_rank),
        ai_rank: 999,
        ai_score: Math.round(aiScore * 10) / 10,
        confidence,
        confidence_reason:
          confidence === "High"
            ? "Match history plus verified tournament data"
            : confidence === "Medium"
              ? "Some verified results, but data set is incomplete"
              : "Limited structured data; needs review before publishing",
        score_breakdown: scoreBreakdown,
        evidence: evidence.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10),
        data_gaps: dataGaps,
        nchsaa_count: (bundle.nchsaa || []).length,
        national_count: (bundle.nhsca || []).length + (bundle.super32 || []).length + (bundle.fargo || []).length,
        match_count: matchScore.totalMatches,
        win_loss: matchScore.winLoss,
        college: (athlete.college as string) || null,
        college_opens_experience: (athlete.college_opens_experience as string) || null,
        achievements: athlete.achievements,
        additional_achievements: (athlete.additional_achievements as string) || null,
      } satisfies RankingBoardAthlete
    }),
  )

  return scored
    .sort((a, b) => b.ai_score - a.ai_score || (a.prospect_ranking || 999) - (b.prospect_ranking || 999) || a.name.localeCompare(b.name))
    .map((athlete, index) => ({ ...athlete, ai_rank: index + 1 }))
}
