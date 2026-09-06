/**
 * Who a wrestler actually wrestled — the in-season question a coach asks first.
 *
 * Two separate claims, deliberately never merged:
 *
 * - **High school season**, from imported match rows. Duals, invitationals and the NCHSAA
 *   postseason: how tested somebody is inside North Carolina, week to week.
 * - **National events**, from the tournament tables. NHSCA, Super 32 and its qualifiers,
 *   Fargo, NC United national team: whether they leave the state and how they do when they
 *   do.
 *
 * A wrestler can be 45-2 against a soft in-state schedule and 1-2 at Super 32; another can
 * grind a brutal dual schedule and never travel. Averaging those into one number hides the
 * only thing the distinction is good for. The two never double-count: national events do not
 * appear in the match import at all.
 *
 * Nothing here is a projection. Every figure traces to bouts on file, which is the point —
 * a coach wants to know who somebody wrestled so he can form his own view, not ours.
 */

import type { HeadToHeadBout } from "@/lib/head-to-head"

/** Opponents at or above this percentile are the ones worth counting separately. */
export const ELITE_OPPONENT_PERCENTILE = 95

/** Imported bouts carry an opponent quality percentile, as "96.14%". */
export function opponentPercentile(bout: { opponent_percentage?: unknown }): number | null {
  const raw = String(bout.opponent_percentage ?? "").replace("%", "").trim()
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function isWin(bout: HeadToHeadBout): boolean {
  const outcome = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return outcome === "W" || outcome.startsWith("W ") || outcome.includes("WIN")
}

function isLoss(bout: HeadToHeadBout): boolean {
  const outcome = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return outcome === "L" || outcome.startsWith("L ") || outcome.includes("LOSS")
}

/** Wins by fall, tech or major — how a coach reads finishing ability. */
function isBonus(bout: HeadToHeadBout): boolean {
  const result = String(bout.result ?? "").trim().toUpperCase()
  return /FALL|PIN|\bTF\b|TECH|\bMD\b|MAJOR/.test(result)
}

export type SeasonStrength = {
  bouts: number
  wins: number
  losses: number
  /** Mean opponent percentile across bouts that carry one. Null when none do. */
  averageOpponentPercentile: number | null
  /** Bouts against opponents at or above ELITE_OPPONENT_PERCENTILE. */
  vsElite: number
  eliteWins: number
  eliteLosses: number
  /** Share of wins that came with bonus points, 0-100. Null when there are no wins. */
  bonusRate: number | null
  /** How much of the schedule was elite, 0-100. The headline number. */
  eliteShare: number | null
}

/**
 * Strength of the high-school season from imported bouts.
 *
 * Bouts without an opponent percentile still count toward the record — dropping them would
 * quietly rewrite somebody's record — but only percentiled bouts inform the strength figures.
 */
export function summarizeSeasonStrength(
  bouts: ReadonlyArray<HeadToHeadBout & { opponent_percentage?: unknown }>,
): SeasonStrength {
  let wins = 0
  let losses = 0
  let bonus = 0
  let vsElite = 0
  let eliteWins = 0
  let eliteLosses = 0
  let percentileSum = 0
  let percentileCount = 0

  for (const bout of bouts) {
    const won = isWin(bout)
    const lost = isLoss(bout)
    if (!won && !lost) continue
    if (won) wins += 1
    else losses += 1
    if (won && isBonus(bout)) bonus += 1

    const percentile = opponentPercentile(bout)
    if (percentile == null) continue
    percentileSum += percentile
    percentileCount += 1
    if (percentile >= ELITE_OPPONENT_PERCENTILE) {
      vsElite += 1
      if (won) eliteWins += 1
      else eliteLosses += 1
    }
  }

  const total = wins + losses
  return {
    bouts: total,
    wins,
    losses,
    averageOpponentPercentile: percentileCount ? round1(percentileSum / percentileCount) : null,
    vsElite,
    eliteWins,
    eliteLosses,
    bonusRate: wins ? Math.round((bonus / wins) * 100) : null,
    eliteShare: percentileCount ? Math.round((vsElite / percentileCount) * 100) : null,
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export type NationalEventRow = {
  event: string
  year: number
  placement: number | null
  record: string | null
}

export type NationalExposure = {
  /** Distinct national events entered. */
  events: number
  /** Most recent year they competed nationally. Null when never. */
  latestYear: number | null
  wins: number
  losses: number
  /** Best finish across every national event, or null when they never placed. */
  bestPlacement: number | null
  bestPlacementEvent: string | null
  /** Events entered, newest first. */
  rows: NationalEventRow[]
}

function parseRecord(record: string | null): { wins: number; losses: number } {
  const m = String(record ?? "").trim().match(/^(\d+)\s*-\s*(\d+)$/)
  if (!m) return { wins: 0, losses: 0 }
  return { wins: Number(m[1]), losses: Number(m[2]) }
}

/**
 * National exposure from the tournament tables.
 *
 * A wrestler who never leaves the state is not a worse wrestler, and this does not say so —
 * it reports what happened, and "no national events on file" is a legitimate answer that a
 * coach can weigh for themselves.
 */
export function summarizeNationalExposure(rows: NationalEventRow[]): NationalExposure {
  let wins = 0
  let losses = 0
  let bestPlacement: number | null = null
  let bestPlacementEvent: string | null = null
  let latestYear: number | null = null

  for (const row of rows) {
    const record = parseRecord(row.record)
    wins += record.wins
    losses += record.losses
    if (row.placement != null && (bestPlacement == null || row.placement < bestPlacement)) {
      bestPlacement = row.placement
      bestPlacementEvent = row.event
    }
    if (latestYear == null || row.year > latestYear) latestYear = row.year
  }

  return {
    events: rows.length,
    latestYear,
    wins,
    losses,
    bestPlacement,
    bestPlacementEvent,
    rows: [...rows].sort((a, b) => b.year - a.year || a.event.localeCompare(b.event)),
  }
}

/**
 * One line answering "did he wrestle anybody good this season".
 *
 * Phrased as a measurement rather than a verdict. A thin record against a hard schedule is a
 * different story from a thin record against a soft one, and only the schedule line tells a
 * coach which he is looking at.
 */
export function seasonStrengthLine(strength: SeasonStrength): string | null {
  if (strength.bouts === 0) return null
  if (strength.vsElite === 0) {
    return strength.averageOpponentPercentile != null
      ? `${strength.bouts} bouts · average opponent in the ${Math.round(strength.averageOpponentPercentile)}th percentile`
      : `${strength.bouts} bouts on file`
  }
  return `${strength.eliteWins}-${strength.eliteLosses} against top-${100 - ELITE_OPPONENT_PERCENTILE}% opponents · ${strength.vsElite} of ${strength.bouts} bouts`
}
