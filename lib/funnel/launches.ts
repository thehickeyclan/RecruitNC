/**
 * When each new state was announced to families, and its first operating target (Matt, 2 Nov 2026:
 * a new state is in launch validation, judged at Day 7, 30 and 60 against other new states, never
 * against North Carolina's totals, which have years of audience behind them).
 *
 * The date is the first family announcement, not the day the code flag went live: South Carolina
 * was switched on 26 Oct and announced on Instagram on 1 Nov.
 */
import type { FunnelState } from "@/lib/funnel/compute"

export type StateLaunch = {
  state: FunnelState
  announced: string
  /** An operating target, not a forecast: enough claims to start learning what converts. */
  target: { claimsLow: number; claimsHigh: number; byDay: number }
}

export const STATE_LAUNCHES: StateLaunch[] = [{ state: "SC", announced: "2026-11-01", target: { claimsLow: 25, claimsHigh: 50, byDay: 30 } }]

export const CHECKPOINT_DAYS = [7, 30, 60] as const
