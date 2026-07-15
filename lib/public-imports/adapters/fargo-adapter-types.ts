import type { FargoResultType } from "@/lib/fargo-result-types"
import type { FargoAgeDivision, FargoGender, FargoStyle } from "@/lib/fargo-division"

export type FargoAdapterId = "usa_bracketing" | "trackwrestling" | "csv_season"

export type FargoBracketContext = {
  year: number
  style: FargoStyle
  gender: FargoGender
  age_division: FargoAgeDivision | string
  source_event_id?: string | null
  source_url?: string | null
  source_label?: string | null
  source_adapter: FargoAdapterId
}

export type FargoParsedMatch = {
  source_match_id?: string | null
  source_bracket_id?: string | null
  weight_class: string
  round?: string | null
  match_order?: number | null
  winner_name: string
  winner_state?: string | null
  winner_club?: string | null
  loser_name: string
  loser_state?: string | null
  loser_club?: string | null
  result_type: FargoResultType
  score?: string | null
  raw?: unknown
}

export type FargoParsedPlacer = {
  athlete_name: string
  weight_class: string
  placement: number
  state?: string | null
  club?: string | null
  seed?: number | null
}

export type FargoAdapterParseResult = {
  adapter: FargoAdapterId
  context: FargoBracketContext
  matches: FargoParsedMatch[]
  placers: FargoParsedPlacer[]
  warnings: string[]
}
