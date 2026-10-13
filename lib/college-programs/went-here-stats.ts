/**
 * "NC wrestlers who went here": the arithmetic (Matt, 13 Oct 2026).
 *
 * A family asks "am I good enough for this program?". We do not answer that - a coach's need at a
 * weight, walk-on against scholarship and everyone he recruits from other states are invisible to
 * us. We show who from North Carolina went, what they had done, and the wrestler's own record
 * beside it.
 *
 * Two rules keep it honest:
 * - **GPA is never one kid's.** An average with its low and high is shown only across at least
 *   MIN_GPA_GROUP wrestlers; with two, the low and the high *are* those two children's grades.
 * - **GPAs are as reported.** Weighted and unweighted are mixed in what families enter (15 of the
 *   first 35 were above 4.0), so every figure carries that label and none is called a benchmark.
 */

import type { AthleteCredentials } from "@/lib/credentials/athlete-credentials"

export const MIN_GPA_GROUP = 5

export type GpaStats = { count: number; average: number; low: number; high: number }

/** "3.8", "4.2 weighted", 3.75 -> a number; anything outside a plausible GPA -> null. */
export function parseGpa(raw: unknown): number | null {
  if (raw == null) return null
  const match = String(raw).match(/\d(?:\.\d+)?/)
  const value = match ? Number(match[0]) : NaN
  return value >= 1.5 && value <= 5 ? value : null
}

export function gpaStats(values: Array<number | null>, minimum = MIN_GPA_GROUP): GpaStats | null {
  const known = values.filter((v): v is number => v != null)
  if (known.length < minimum) return null
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    count: known.length,
    average: round(known.reduce((a, b) => a + b, 0) / known.length),
    low: round(Math.min(...known)),
    high: round(Math.max(...known)),
  }
}

/** The single best thing a wrestler did in high school, for counting a group. */
export type Tier = "state-champion" | "state-placer" | "state-qualifier" | "none"

export function stateTier(creds: AthleteCredentials): Tier {
  if (creds.state.some((s) => s.place === 1)) return "state-champion"
  if (creds.state.some((s) => s.place != null && s.place > 1)) return "state-placer"
  if (creds.state.length > 0) return "state-qualifier"
  return "none"
}

/** Top eight at NHSCA, Fargo or Super 32. */
export function placedNationally(creds: AthleteCredentials): boolean {
  return creds.national.some((r) => r.place != null && r.place >= 1 && r.place <= 8)
}

export type GroupSummary = {
  wrestlers: number
  stateChampions: number
  /** Placed at state without winning it. */
  statePlacers: number
  stateQualifiers: number
  nationalPlacers: number
}

export type Standing = { tier: Tier; national: boolean }

export const standingOf = (creds: AthleteCredentials): Standing => ({ tier: stateTier(creds), national: placedNationally(creds) })

export function summariseStandings(all: Standing[]): GroupSummary {
  return {
    wrestlers: all.length,
    stateChampions: all.filter((s) => s.tier === "state-champion").length,
    statePlacers: all.filter((s) => s.tier === "state-placer").length,
    stateQualifiers: all.filter((s) => s.tier === "state-qualifier").length,
    nationalPlacers: all.filter((s) => s.national).length,
  }
}

export function summariseGroup(all: AthleteCredentials[]): GroupSummary {
  return summariseStandings(all.map(standingOf))
}

/** "9 of 17 were NCHSAA state champions, 6 more placed at state, and 5 placed at a national tournament." */
export function groupSentence(summary: GroupSummary): string | null {
  const n = summary.wrestlers
  if (n === 0) return null
  const parts: string[] = []
  if (summary.stateChampions > 0) {
    parts.push(
      `${summary.stateChampions} of ${n} ${summary.stateChampions === 1 ? "was an NCHSAA state champion" : "were NCHSAA state champions"}`,
    )
  }
  if (summary.statePlacers > 0) parts.push(`${summary.statePlacers}${parts.length ? " more" : ` of ${n}`} placed at state`)
  if (summary.nationalPlacers > 0) parts.push(`${summary.nationalPlacers} placed at a national tournament`)
  if (parts.length === 0) return `None of the ${n} placed at the NCHSAA state tournament on our records.`
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
  return `${joined}.`
}

/** A first-person clause from the email rules ("placed 3rd at ...") as a line about someone else. */
export function asHeadline(clause: string): string {
  return clause.charAt(0).toUpperCase() + clause.slice(1)
}
