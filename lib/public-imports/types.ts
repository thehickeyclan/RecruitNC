/** Official public-source import pipeline (stage → review → promote). */

export const DATASET_DUAL_TEAM = "nchsaa_dual_team_champions" as const
export const DATASET_PLACERS = "nchsaa_individual_placers" as const
export const DATASET_CLASSIFICATIONS = "nchsaa_school_classifications" as const
export const DATASET_FARGO = "fargo_nationals_results" as const
export const DATASET_FARGO_BOUTS = "fargo_nationals_bouts" as const

export type DatasetKey =
  | typeof DATASET_DUAL_TEAM
  | typeof DATASET_PLACERS
  | typeof DATASET_CLASSIFICATIONS
  | typeof DATASET_FARGO
  | typeof DATASET_FARGO_BOUTS

export type DiffStatus = "new" | "match" | "changed" | "conflict"
export type RowReviewStatus = "pending" | "approved" | "rejected" | "skipped"
export type BatchStatus = "pending" | "partial" | "approved" | "rejected"

export type DualTeamProposed = {
  year: number
  division: string
  champion_school: string
  runner_up_school?: string | null
  champion_score?: number | null
  runner_up_score?: number | null
  is_vacated?: boolean | null
  held?: boolean | null
  notes?: string | null
}

export type PlacerProposed = {
  year: number
  classification: string
  weight_class: string
  place: number
  wrestler_name: string
  school: string
  /** From men/women championship pages — used for staging identity when M/F share class+weight. */
  gender?: "M" | "F" | null
}

/** Official NCHSAA school membership for a season / realignment cycle. */
export type ClassificationProposed = {
  /** Season year these classes apply (e.g. 2026 for 2025-26). */
  effective_year: number
  school_name: string
  classification: string
  region?: string | null
  conference?: string | null
  enrollment?: number | null
  cycle_label?: string | null
}

/**
 * Fargo Nationals season aggregate (Phase 1 SoR).
 * style FS vs GR are never merged — same athlete may have multiple rows per year.
 */
export type FargoProposed = {
  year: number
  athlete_name: string
  first_name?: string | null
  last_name?: string | null
  /** Full display division e.g. "Junior Boys Freestyle" */
  division: string
  /** FS = Freestyle, GR = Greco-Roman */
  style: "FS" | "GR"
  gender: "M" | "F"
  age_division: string
  weight_class: string
  wins: number
  losses: number
  record?: string | null
  placement?: number | null
  is_all_american: boolean
  high_school?: string | null
  state?: string | null
  club?: string | null
  notes?: string | null
  event_name?: string | null
  source_url?: string | null
  source_label?: string | null
  athlete_id?: string | null
}

/** Fargo bout-level SoR (Phase 2). One row per athlete perspective of a match. */
export type FargoBoutProposed = {
  year: number
  style: "FS" | "GR"
  gender: "M" | "F"
  age_division: string
  weight_class: string
  athlete_name: string
  athlete_id?: string | null
  athlete_state?: string | null
  athlete_club?: string | null
  opponent_name?: string | null
  opponent_state?: string | null
  opponent_club?: string | null
  round?: string | null
  result_type?: string | null
  score?: string | null
  win: boolean
  match_order?: number | null
  source_event_id?: string | null
  source_bracket_id?: string | null
  source_match_id?: string | null
  source_url?: string | null
  source_adapter?: string | null
  source_payload?: unknown
  verification_status?: string | null
}

export type StagedDiffRow = {
  dataset_key: DatasetKey
  natural_key: string
  diff_status: DiffStatus
  proposed:
    | DualTeamProposed
    | PlacerProposed
    | ClassificationProposed
    | FargoProposed
    | FargoBoutProposed
  existing: Record<string, unknown> | null
}
