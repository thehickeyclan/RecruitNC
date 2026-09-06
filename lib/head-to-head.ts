/**
 * Head-to-head between two wrestlers, on one rule shared by TOC seeding and rankings.
 *
 * Two rules, both from how coaches actually read a series:
 *
 * 1. Only meetings in the last 12 months count. A win from two seasons ago, at a different
 *    weight and a different stage of growing up, is not evidence about who is better now.
 * 2. The most recent meeting carries the most weight — it decides the pairing. A split
 *    series used to read as no head-to-head at all, so Adam Walker losing to Luke Richards
 *    in January and beating him at the September qualifier came out 1-1 and settled on
 *    résumé, ignoring the more recent bout that had already answered it.
 *
 * The two engines must not disagree about who beat whom, which is why this lives in one
 * file rather than being implemented twice.
 */

import { namesLikelySamePerson } from "@/lib/athlete-name-match"

/** Meetings older than this stop counting. */
export const HEAD_TO_HEAD_WINDOW_DAYS = 365

const DAY_MS = 86_400_000

/** A bout as stored in `matches.matches`, from either of the two shapes in use. */
export type HeadToHeadBout = {
  opponent_name?: unknown
  opponent?: unknown
  win_loss?: unknown
  result?: unknown
  tournament?: unknown
  date?: unknown
}

/** One dated meeting between two wrestlers, from any source. */
export type DatedMeeting = {
  /** Epoch ms, or null when the source carried no usable date. */
  at: number | null
  won: boolean
  /** Phrased for a seeding note: "won DEC 4-2 — Quarter-Finals, ...". */
  summary: string
}

export function boutDateMs(raw: unknown): number | null {
  const value = String(raw ?? "").trim()
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function didWin(bout: HeadToHeadBout): boolean {
  const result = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return result === "W" || result.startsWith("W ") || result.includes("WIN")
}

function didLose(bout: HeadToHeadBout): boolean {
  const result = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return result === "L" || result.startsWith("L ") || result.includes("LOSS")
}

/**
 * Dated meetings against one opponent, pulled from imported match rows.
 *
 * `flip` mirrors the perspective: the opponent's own row holds the same bout from the other
 * side, so a loss there is a win here.
 */
export function datedMeetingsAgainst(
  bouts: HeadToHeadBout[],
  opponentName: string,
  flip = false,
): DatedMeeting[] {
  const out: DatedMeeting[] = []
  for (const bout of bouts) {
    const opponent = String(bout.opponent_name ?? bout.opponent ?? "").trim()
    if (!opponent || !namesLikelySamePerson(opponent, opponentName)) continue
    const won = didWin(bout)
    const lost = didLose(bout)
    if (!won && !lost) continue
    const tournament = String(bout.tournament ?? "").trim()
    const date = String(bout.date ?? "").trim()
    const outcome = flip ? lost : won
    out.push({
      at: boutDateMs(date),
      won: outcome,
      summary: `${outcome ? "won" : "lost"}${tournament ? ` — ${tournament}` : ""}${date ? `, ${date}` : ""}`,
    })
  }
  return out
}

export type PairingRecord = {
  wins: number
  losses: number
  /** Did this wrestler win the most recent meeting inside the window? */
  lastMeetingWon: boolean | null
  lastMeetingNote: string | null
  /** True when the series is split and only the latest bout separates them. */
  decidedByRecency: boolean
}

/** Empty pairing — no qualifying meeting in the window. */
const NO_PAIRING: PairingRecord = {
  wins: 0,
  losses: 0,
  lastMeetingWon: null,
  lastMeetingNote: null,
  decidedByRecency: false,
}

/**
 * Reduce every known meeting to one pairing record.
 *
 * Meetings on the same day are the same bout arriving from two sources (the athlete's row,
 * the opponent's mirrored row, and the qualifier bout table all carry it), so they collapse
 * rather than counting twice.
 */
export function resolvePairing(meetings: DatedMeeting[], now: number = Date.now()): PairingRecord {
  const cutoff = now - HEAD_TO_HEAD_WINDOW_DAYS * DAY_MS
  const inWindow = meetings.filter((m) => m.at != null && (m.at as number) >= cutoff)
  if (inWindow.length === 0) return NO_PAIRING

  const byDay = new Map<number, DatedMeeting>()
  for (const meeting of inWindow) {
    const day = Math.floor((meeting.at as number) / DAY_MS)
    if (!byDay.has(day)) byDay.set(day, meeting)
  }
  const unique = [...byDay.values()].sort((a, b) => (b.at as number) - (a.at as number))

  const wins = unique.filter((m) => m.won).length
  const losses = unique.length - wins
  const latest = unique[0]!
  return {
    wins,
    losses,
    lastMeetingWon: latest.won,
    lastMeetingNote: latest.summary,
    decidedByRecency: wins === losses,
  }
}

/**
 * Does this wrestler hold the head-to-head?
 *
 * The most recent meeting decides. It is the strongest evidence of who is beating whom now,
 * and it is what settles a split series that an aggregate would call even.
 */
export function holdsHeadToHeadEdge(record: {
  wins: number
  losses: number
  lastMeetingWon?: boolean | null
}): boolean {
  if (record.lastMeetingWon != null) return record.lastMeetingWon
  return record.wins > record.losses
}
