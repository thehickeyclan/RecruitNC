/**
 * Strength of competition — who a wrestler has actually faced, counted.
 *
 * Renamed from "strength of schedule" because a schedule is only the in-season half. What a
 * college coach is weighing is the whole competitive footprint: the calibre of opponent beaten,
 * how tested the season was, and whether this is someone who wrestles beyond February.
 *
 * Three rules, learned the hard way this week:
 *
 * 1. **No composite score.** A single number would have to answer "out of what?", and we have
 *    just finished removing one ("top 5%") that could not. Every figure here is a count a coach
 *    can trace to a bout or an entry.
 * 2. **Team-blind events only, for anything comparative.** NHSCA Duals and AAU are ingested for
 *    NC United squads only, so counting them would rank our own athletes above identical
 *    wrestlers who travelled with another program. They belong in the results table, not in a
 *    number used to compare.
 * 3. **Every count carries its window.** 67 of 343 athletes with match data have one season on
 *    file — transfers and freshmen alike. Without the window, a short record reads as a quiet
 *    wrestler rather than a short record.
 */

import type { SeasonStrength } from "@/lib/competition-strength"
import { buildCompetitionGrade, type CompetitionGrade } from "@/lib/competition-grade"

/** Events ingested regardless of which team a wrestler travelled with. */
const TEAM_BLIND_EVENTS = [
  "NHSCA Nationals",
  "Fargo",
  "Super 32",
  "Super 32 Early Entry",
  "Journeymen",
  "I-64",
  "Tournament of Champions",
]

/**
 * Whether we would hold this event for any NC wrestler, or only for ours.
 *
 * "NHSCA Duals" deliberately does not match "NHSCA Nationals" — the Duals are an NC United
 * team entry and the Nationals are an individual tournament we ingest for everybody.
 */
export function isTeamBlindEvent(event: string): boolean {
  const name = String(event ?? "").toLowerCase()
  if (name.includes("dual") && name.includes("nhsca")) return false
  if (name.includes("aau")) return false
  return TEAM_BLIND_EVENTS.some((e) => name.includes(e.toLowerCase()))
}

export type RankedWinCounts = {
  /** Beat someone carrying a national ranking. */
  national: number
  /** Beat someone in the Tournament of Champions field. */
  tocField: number
  /** Beat someone ranked inside North Carolina. */
  stateRanked: number
  total: number
}

export type StrengthOfCompetition = {
  rankedWins: RankedWinCounts
  /** Losses to opponents carrying any credential — context, never a penalty. */
  credentialedLosses: number
  season: SeasonStrength | null
  /** Which season `season` describes, e.g. "2025-26". */
  seasonLabel: string | null
  /** Team-blind events entered, newest first, for the coach to read directly. */
  nationalEvents: string[]
  /** Events entered with an NC United squad — shown, never counted comparatively. */
  teamEvents: string[]
  /** Off-season entries — the only way an NC wrestler can travel, since in-season is barred. */
  offSeasonEvents: number
  /** Earliest result or bout we hold, so every count above has a visible denominator. */
  recordsBeginYear: number | null
  seasonsOnFile: number
  /** Red to green, with the step that would raise it. */
  grade: CompetitionGrade
}

export function countRankedWins(
  wins: ReadonlyArray<{ reason: string }>,
): RankedWinCounts {
  let national = 0
  let tocField = 0
  let stateRanked = 0
  for (const w of wins) {
    if (w.reason === "national-ranked") national += 1
    else if (w.reason === "toc-field") tocField += 1
    else stateRanked += 1
  }
  return { national, tocField, stateRanked, total: wins.length }
}

export function buildStrengthOfCompetition(input: {
  significantWins: ReadonlyArray<{ reason: string }>
  significantLosses: ReadonlyArray<unknown>
  results: ReadonlyArray<{ event: string; year: number }>
  season: SeasonStrength | null
  seasonLabel: string | null
  seasonsOnFile: number
}): StrengthOfCompetition {
  const nationalEvents: string[] = []
  const teamEvents: string[] = []
  for (const r of input.results) {
    if (isTeamBlindEvent(r.event)) {
      if (!nationalEvents.includes(r.event)) nationalEvents.push(r.event)
    } else if (/nhsca duals|aau/i.test(r.event)) {
      if (!teamEvents.includes(r.event)) teamEvents.push(r.event)
    }
  }

  const years = input.results.map((r) => r.year).filter((y) => Number.isFinite(y) && y > 1900)

  /*
   * Off-season entries. North Carolina wrestles November to February and bars out-of-state
   * competition inside it, so everything here is, by definition, a wrestler choosing to keep
   * going when the season stopped.
   */
  const offSeason = new Set(
    input.results.filter((r) => isTeamBlindEvent(r.event)).map((r) => `${r.event}|${r.year}`),
  ).size

  const rankedWins = countRankedWins(input.significantWins)

  return {
    rankedWins,
    offSeasonEvents: offSeason,
    grade: buildCompetitionGrade({
      rankedWins: rankedWins.total,
      nationalEvents: nationalEvents.length,
      offSeasonEvents: offSeason,
    }),
    credentialedLosses: input.significantLosses.length,
    season: input.season,
    seasonLabel: input.seasonLabel,
    nationalEvents,
    teamEvents,
    recordsBeginYear: years.length ? Math.min(...years) : null,
    seasonsOnFile: input.seasonsOnFile,
  }
}

/** The panel as facts lines, for the summary model. Never a score. */
export function strengthOfCompetitionFacts(s: StrengthOfCompetition): string[] {
  const lines: string[] = []
  const w = s.rankedWins
  if (w.total > 0) {
    const parts = [
      w.national ? `${w.national} over nationally ranked opponents` : "",
      w.tocField ? `${w.tocField} over Tournament of Champions field opponents` : "",
      w.stateRanked ? `${w.stateRanked} over North Carolina ranked opponents` : "",
    ].filter(Boolean)
    lines.push(`Ranked wins: ${parts.join(", ")}.`)
  }
  if (s.credentialedLosses > 0) {
    lines.push(`Losses to credentialed opponents: ${s.credentialedLosses}.`)
  }
  if (s.nationalEvents.length) {
    lines.push(`National and out-of-state events entered: ${s.nationalEvents.join(", ")}.`)
  }
  if (s.teamEvents.length) {
    lines.push(
      `Entered with an NC United squad: ${s.teamEvents.join(", ")}. We hold team events only for` +
        ` our own squads, so their absence on another wrestler means nothing.`,
    )
  }
  if (s.recordsBeginYear) {
    const seasons = s.seasonsOnFile === 1 ? "1 season" : `${s.seasonsOnFile} seasons`
    lines.push(
      `Coverage: every count above is drawn from ${seasons} on file, beginning ${s.recordsBeginYear}.` +
        (s.seasonsOnFile <= 1
          ? " That is a short record — a wrestler who transferred in or is in their first year" +
            " will look quiet here regardless of what they have done. Do not read it as a limit."
          : ""),
    )
  }
  return lines
}
