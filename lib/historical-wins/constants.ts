/** Dataset keys for NCHSAA single-season most victories (canonical v1). */
export const HISTORICAL_WINS_DATASET_KEY = "nc_wrestling_most_victories_single_season"
export const HISTORICAL_WINS_SOURCE_KEY = "nchsaa_most_victories_season_all_time"
export const HISTORICAL_WINS_VERSION = 1
export const HISTORICAL_WINS_EXPECTED_COUNT = 521
export const HISTORICAL_WINS_RECORD_CATEGORY = "single_season_wins"

export const HISTORICAL_WINS_MATCH_STATUSES = [
  "matched",
  "unmatched",
  "needs_review",
  "manually_confirmed",
  "manually_rejected",
] as const

export type HistoricalWinsMatchStatus = (typeof HISTORICAL_WINS_MATCH_STATUSES)[number]

/** Profile links only for these statuses. */
export const HISTORICAL_WINS_LINKABLE_STATUSES: ReadonlySet<HistoricalWinsMatchStatus> = new Set([
  "matched",
  "manually_confirmed",
])
