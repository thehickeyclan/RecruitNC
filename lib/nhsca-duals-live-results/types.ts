/** NHSCA Duals 2026 live results — shared types */

export const NHSCA_DUALS_EVENT_KEY = "nhsca-duals-2026"

export type NhscaDualsTeamType = "national" | "select" | "opponent"

export type NhscaDualsDualStatus = "not_started" | "in_progress" | "final"

export type NhscaDualsMatchWinner = "nc" | "opponent" | "draw" | "no_match"

export type NhscaDualsResultType =
  | "fall"
  | "forfeit"
  | "injury_default"
  | "dq"
  | "tech_fall"
  | "major_decision"
  | "decision"
  | "draw"
  | "no_match"

export type NhscaDualsTeamRow = {
  id: string
  name: string
  team_type: NhscaDualsTeamType
}

export type NhscaDualsWrestlerRow = {
  id: string
  team_id: string
  name: string
  weight_class: string
  display_weight: string
  active: boolean
}

export type NhscaDualsEventDayRow = {
  id: string
  name: string
  event_date: string | null
  sort_order: number
}

export type NhscaDualsPoolRow = {
  id: string
  day_id: string
  team_id: string
  pool_number: number
}

export type NhscaDualsDualRow = {
  id: string
  team_id: string
  day_id: string
  pool_id: string
  round_name: string
  opponent_team_name: string
  status: NhscaDualsDualStatus
  nc_score: number
  opponent_score: number
  sort_order: number
  published: boolean
}

export type NhscaDualsMatchRow = {
  id: string
  dual_id: string
  weight: string
  nc_wrestler_id: string | null
  opponent_wrestler_name: string
  winner: NhscaDualsMatchWinner | null
  result_type: NhscaDualsResultType | null
  nc_points: number
  opponent_points: number
  notes: string | null
}

export type NhscaDualsWrestlerRecord = {
  wrestlerId: string
  name: string
  displayWeight: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
}

export type NhscaDualsTeamSummary = {
  dualWins: number
  dualLosses: number
  matchWins: number
  matchLosses: number
  pointsFor: number
  pointsAgainst: number
  undefeated: NhscaDualsWrestlerRecord[]
  topScorers: { name: string; displayWeight: string; pointsFor: number }[]
}

export type NhscaDualsResultsSnapshot = {
  teams: NhscaDualsTeamRow[]
  wrestlers: NhscaDualsWrestlerRow[]
  days: NhscaDualsEventDayRow[]
  pools: NhscaDualsPoolRow[]
  duals: NhscaDualsDualRow[]
  matches: NhscaDualsMatchRow[]
  summaries: Record<"national" | "select", NhscaDualsTeamSummary>
}
