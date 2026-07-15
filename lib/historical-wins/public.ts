import { HISTORICAL_WINS_LINKABLE_STATUSES, type HistoricalWinsMatchStatus } from "@/lib/historical-wins/constants"
import { RECRUITNC_PROFILE_PATH } from "@/lib/athlete-profile-links"

export type WinningestWrestlerPublicRow = {
  id: number
  rank_position: string | null
  rank_numeric: number
  is_tied: boolean | null
  wrestler_name: string
  school: string
  record: string
  wins: number
  losses: number
  year: string
  athlete_id: string | null
  match_status: HistoricalWinsMatchStatus | string | null
}

export function shouldLinkWinningestAthlete(row: {
  athlete_id?: string | null
  match_status?: string | null
}): boolean {
  if (!row.athlete_id) return false
  const status = (row.match_status ?? "unmatched") as HistoricalWinsMatchStatus
  return HISTORICAL_WINS_LINKABLE_STATUSES.has(status)
}

export function winningestAthleteHref(athleteId: string): string {
  return `${RECRUITNC_PROFILE_PATH}?id=${encodeURIComponent(athleteId)}`
}
