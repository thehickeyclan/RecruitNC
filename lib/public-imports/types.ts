/** Official public-source import pipeline (stage → review → promote). */

export const DATASET_DUAL_TEAM = "nchsaa_dual_team_champions" as const
export const DATASET_PLACERS = "nchsaa_individual_placers" as const

export type DatasetKey = typeof DATASET_DUAL_TEAM | typeof DATASET_PLACERS

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

export type StagedDiffRow = {
  dataset_key: DatasetKey
  natural_key: string
  diff_status: DiffStatus
  proposed: DualTeamProposed | PlacerProposed
  existing: Record<string, unknown> | null
}
