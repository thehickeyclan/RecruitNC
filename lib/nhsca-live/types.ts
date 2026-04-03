export interface NCWrestler {
  id: string
  name: string
  weight_class: string
  seed: number | null
  wins: number
  losses: number
  bracket_status: "active" | "eliminated" | "champion" | "placed"
  placement: number | null
  notable_wins: string[] | null
  gender: "Male" | "Female"
  created_at: string
  updated_at: string
}

export interface RankedWrestler {
  id: string
  name: string
  weight_class: string
  ranking: number | null
  state: string | null
  team: string | null
  created_at: string
  updated_at: string
}

export interface LiveMatch {
  id: string
  nc_wrestler_id: string
  nc_wrestler_name: string
  opponent_name: string
  weight_class: string
  round: string | null
  status: "live" | "completed"
  nc_score: number
  opponent_score: number
  result: "win" | "loss" | null
  win_type: string | null
  is_notable: boolean
  created_at: string
  updated_at: string
}

export interface MatchUpdate {
  id: string
  match_id: string
  update_text: string
  timestamp: string
}

export interface DashboardStats {
  totalWrestlers: number
  activeWrestlers: number
  totalWins: number
  totalLosses: number
  notableWins: number
  liveMatches: number
  returningWrestlers?: number
  winningRecords?: number
  stats2024?: {
    totalWrestlers: number
    totalWins: number
    totalLosses: number
    winPercentage: number
  }
}

export interface NCRoster2024 {
  id: string
  first_name: string
  last_name: string
  full_name: string
  school: string | null
  class: string | null
  weight_class: string
  wins: number
  losses: number
  champ_wins: number
  champ_round_exit: string | null
  consi_wins: number
  consi_round_exit: string | null
  seeded_match_wins: number
  seeded_match_losses: number
  top_performer: boolean
  elite: boolean
  created_at: string
}

export interface NCWrestlerWithHistory extends NCWrestler {
  is_returning: boolean
  roster_2024_id: string | null
  data_2024?: NCRoster2024
}
