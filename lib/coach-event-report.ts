/**
 * The event report a college coach receives after a tournament: one entry for every wrestler he
 * has starred - where each finished, his record there, the wins worth naming and the losses that
 * say something.
 *
 * Matt's public commitment (Super 32, 24-25 October 2026): within 24 hours of the finals, every
 * college coach gets one email covering each starred wrestler. It is proved first on events we
 * already hold - the 2026 Journeymen Fall Classic and the 2025 Super 32.
 *
 * Everything here is computed. No model writes a word of it:
 *
 * - **An event is its source files**, never its printed name. Labels have been wrong before; the
 *   import file is what a row actually came from.
 * - **Bouts reach a wrestler the way they reach his profile** (`getOtherTournamentBoutsForAthleteRecord`
 *   in lib/other-tournaments.ts) - the loader passes them in; nothing here matches by name.
 * - **Placement is derived from the placement-round bouts** (`PLACEMENT_ROUNDS`), never read from a
 *   placement column. Where the bracket structure cannot support a place, there is no place.
 * - **Significant wins and notable losses are the profile's own** (`findSignificantWins`,
 *   `findSignificantLosses`, `withAccoladesOnly` and the profile's credential labels) run over this
 *   event's bouts alone. An opponent with no computed credential has none.
 * - **No middle school bouts**, and the weight is the weight he wrestled here, never
 *   `athletes.weightclass`.
 * - **A starred wrestler who did not compete is listed as such**, never dropped.
 */

import { PLACEMENT_ROUNDS } from "@/lib/data-dawg-agent-v2/tournament-bouts"
import { highSchoolBouts } from "@/lib/high-school-window"
import {
  displayName,
  placementLabel,
  significantWinBout,
  weightKey,
  type OtherTournamentBout,
} from "@/lib/other-tournaments"
import {
  findSignificantLosses,
  findSignificantWins,
  notableLossCredential,
  rankedOnBoard,
  significantWinCredential,
  withAccoladesOnly,
  type Bout,
  type OpponentIndex,
} from "@/lib/significant-wins"

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

export type ReportEventSource = {
  eventKey: string
  /** The import files that make up this part of the event. Rows from any other file are ignored. */
  sourceFiles: readonly string[]
  /**
   * False for a bracket whose finish is not a place at the tournament: an overflow bracket's bouts
   * count, its place does not (Matt).
   */
  placementsCount: boolean
  /** Printed beside the bouts from this part of the event ("Overflow"). */
  bracketLabel?: string
}

export type ReportEvent = {
  key: string
  name: string
  date: string
  /**
   * "single-bracket": one double-elimination bracket per weight (Super 32).
   * "tiered": pre-rounds (Round of 32/16 or round-robin pools) sort a weight into several brackets
   * that each run their own finals - only the top bracket's finish is a place (Journeymen).
   */
  format: "single-bracket" | "tiered"
  sources: readonly ReportEventSource[]
  /** Where the profile shows this event's finish, for the cross-check the CLI prints. */
  profileSection?: { table: "super32"; year: number } | { table: "other" }
}

/**
 * Events identified by what we imported, checked against the rows on 16 October 2026:
 *
 * - Journeymen 2026: the main event is `journeymen-fall-classic-2026` / jmmain-boys.csv (3 Oct);
 *   the overflow, wrestled the day before, is `journeymen-fall-classic-2026-of` / jm26-boys.csv.
 * - Super 32 2025: `super32-2025`, the full export plus a separate NC girls file.
 */
export const REPORT_EVENTS: Record<string, ReportEvent> = {
  "journeymen-fall-classic-2026": {
    key: "journeymen-fall-classic-2026",
    name: "2026 Journeymen Fall Classic",
    date: "2026-10-03",
    format: "tiered",
    sources: [
      { eventKey: "journeymen-fall-classic-2026", sourceFiles: ["jmmain-boys.csv"], placementsCount: true },
      {
        eventKey: "journeymen-fall-classic-2026-of",
        sourceFiles: ["jm26-boys.csv"],
        placementsCount: false,
        bracketLabel: "Overflow",
      },
    ],
    profileSection: { table: "other" },
  },
  "super32-2025": {
    key: "super32-2025",
    name: "2025 Super 32",
    date: "2025-10-18",
    format: "single-bracket",
    sources: [
      {
        eventKey: "super32-2025",
        sourceFiles: ["2025DefenseSoapSuper32Challenge.csv", "super32-2025-nc-girls-bouts.csv"],
        placementsCount: true,
      },
    ],
    profileSection: { table: "super32", year: 2025 },
  },
}

/* ------------------------------------------------------------------ *
 * Inputs and outputs
 * ------------------------------------------------------------------ */

/** One row of the event as imported, for every entrant - the bracket structure is read from it. */
export type FieldRow = {
  eventKey: string
  sourceFile: string | null
  athleteName: string
  weight: string
  round: string
  boutOrder: number
  opponentName: string | null
  win: boolean
  isBye: boolean
}

export type ReportAthleteInput = {
  id: string
  name: string
  gender: string | null
  graduationYear: number | null
  school: string | null
  /** His bouts as the profile reads them (any event); filtered to this event here. */
  bouts: readonly OtherTournamentBout[]
  /**
   * The results his profile shows for this event's sources, or null when not checked. When given,
   * a bout counts only under a result the profile shows (the profile hangs bouts under their result
   * row by weight, as getOtherTournamentProfileBlocks does). A bout linked to him with no result on
   * his profile is the mis-link trap - Carson Owens (190, Leesville Road) carries a 140 lb Team
   * Shutt wrestler's Journeymen 2026 bouts - and is held back, never reported.
   */
  profileResults?: ReadonlyArray<{ eventKey: string; weight: string }> | null
  /**
   * The Strength of Competition grade his public profile shows today
   * (lib/profile/load-profile-strength.ts). Null or absent: it could not be computed.
   */
  strength?: StrengthOfCompetitionLine | null
}

/** The profile's "Strength of Competition" row: the grade label and its one-line verdict. */
export type StrengthOfCompetitionLine = { grade: string; line: string }

export type ReportBout = {
  round: string
  opponent: string
  opponentClub: string | null
  outcome: "W" | "L"
  method: string | null
  score: string | null
  weight: string
  /** "Overflow" for a bout outside the main event, otherwise null. */
  bracket: string | null
}

export type ReportResult = {
  opponent: string
  opponentSchool: string | null
  result: string | null
  weight: number | null
  /** The profile's own label for the opponent: "2026 PA AAA State Champion", "#4 FloWrestling". */
  credential: string | null
}

export type AthleteEventReport = {
  athleteId: string
  name: string
  classYear: number | null
  gender: string | null
  school: string | null
  competed: boolean
  /** "Champion", "2nd", "3rd" ... or null when no place can be stated. */
  placement: string | null
  place: number | null
  /** Why there is no place, or what the bracket finish was when it is not a tournament place. */
  placementNote: string | null
  /** The weight(s) wrestled at this event. */
  weight: string | null
  record: { wins: number; losses: number }
  bouts: ReportBout[]
  significantWins: ReportResult[]
  notableLosses: ReportResult[]
  /** Bouts linked to him at this event that his profile does not show: held back, never reported. */
  unverifiedBouts: number
  /**
   * Bouts the bracket file records only from the opponent's side - a row naming him as the
   * opponent, in a round he has no row for. Not counted (they are not linked to him); a warning
   * for whoever sends the report that his record may be short.
   */
  opponentSideOnly: number
  /** One computed sentence: "He went 4-1 at 152 and placed 3rd." */
  summary: string
  /**
   * Strength of Competition exactly as his profile shows it ("Tested" · "Beats ranked opponents,
   * ..."). Competed wrestlers only; null when it could not be computed - never guessed.
   */
  strength: StrengthOfCompetitionLine | null
}

/* ------------------------------------------------------------------ *
 * Bracket structure
 * ------------------------------------------------------------------ */

/** Pre-rounds: the rounds that sort a weight into brackets before any bracket is wrestled. */
const PRE_ROUND = /^(round of \d+|rr rnd \d+)$/i

function placementRound(round: string): [number, number] | null {
  const hit = PLACEMENT_ROUNDS.find(([re]) => re.test(String(round ?? "")))
  return hit ? [hit[1], hit[2]] : null
}

/** The most other losses a wrestler can carry into a placement match of a double-elimination bracket. */
function maxPriorLosses(placeIfWon: number): number {
  return placeIfWon === 1 ? 0 : placeIfWon === 3 ? 1 : 2
}

const norm = (name: string | null | undefined) => displayName(name).trim().toLowerCase()

function bracketKey(eventKey: string, sourceFile: string | null | undefined, weight: string): string {
  return `${eventKey}|${sourceFile ?? ""}|${weightKey(weight)}`
}

export type BracketVerdict =
  /** Every placement match at this weight is a place at the tournament. */
  | { kind: "single" }
  /** Only this group's placement matches are places; the rest are lower-tier brackets. */
  | { kind: "tiered"; top: ReadonlySet<string> }
  /** Two or more brackets look equally like the top one: no place can be stated in any of them. */
  | { kind: "ambiguous"; top: ReadonlySet<string> }

/**
 * For a tiered event, which wrestlers at each weight are in the top bracket.
 *
 * The weight's brackets are the connected groups of wrestlers who met in bracket rounds (anything
 * that is not a pre-round). The top bracket is the group with the best record in the pre-rounds -
 * at Journeymen 2026 that group went 1.00 in the pre-rounds at every bracketed weight but one
 * (106: 0.94), and its champion is the only finals winner unbeaten on the day. Where two groups
 * tie for the top (120 lb ran two unbeaten brackets) there is no place to state.
 */
export function analyzeBrackets(event: ReportEvent, field: readonly FieldRow[]): Map<string, BracketVerdict> {
  const out = new Map<string, BracketVerdict>()
  const byBracket = new Map<string, FieldRow[]>()
  for (const row of field) {
    const key = bracketKey(row.eventKey, row.sourceFile, row.weight)
    byBracket.set(key, [...(byBracket.get(key) ?? []), row])
  }
  for (const [key, rows] of byBracket) {
    if (event.format === "single-bracket") {
      out.set(key, { kind: "single" })
      continue
    }
    const names = new Set(rows.map((r) => norm(r.athleteName)))
    const parent = new Map<string, string>()
    const find = (x: string): string => {
      const p = parent.get(x) ?? x
      if (p === x) return x
      const root = find(p)
      parent.set(x, root)
      return root
    }
    for (const r of rows) {
      if (PRE_ROUND.test(r.round) || r.isBye || !r.opponentName) continue
      const a = norm(r.athleteName)
      const b = norm(r.opponentName)
      if (!names.has(b)) continue
      const ra = find(a)
      const rb = find(b)
      if (ra !== rb) parent.set(ra, rb)
    }
    // Only groups that wrestled a placement match are brackets.
    const groups = new Map<string, string[]>()
    for (const n of names) {
      const inBracket = rows.some((r) => norm(r.athleteName) === n && placementRound(r.round))
      if (!inBracket) continue
      groups.set(find(n), [...(groups.get(find(n)) ?? []), n])
    }
    if (groups.size === 0) continue
    const rated = [...groups.values()].map((members) => {
      const pre = rows.filter((r) => members.includes(norm(r.athleteName)) && PRE_ROUND.test(r.round) && !r.isBye)
      return { members, rate: pre.length ? pre.filter((r) => r.win).length / pre.length : 1 }
    })
    rated.sort((a, b) => b.rate - a.rate)
    const tied = rated.filter((g) => g.rate === rated[0]!.rate)
    const top = new Set(tied.flatMap((g) => g.members))
    out.set(key, tied.length > 1 ? { kind: "ambiguous", top } : { kind: "tiered", top })
  }
  return out
}

/* ------------------------------------------------------------------ *
 * One wrestler
 * ------------------------------------------------------------------ */

type EventBout = OtherTournamentBout & { source: ReportEventSource }

/**
 * Whether any contested bout linked to him is at this event's sources - the cheap test a loader uses
 * to skip per-wrestler work for those who cannot have competed. Not the competed verdict itself
 * (buildAthleteEventReport also holds back bouts his profile does not show).
 */
export function hasBoutsAtEvent(event: ReportEvent, bouts: readonly OtherTournamentBout[]): boolean {
  return eventBoutsFor(event, bouts).some((b) => !b.isBye)
}

function eventBoutsFor(event: ReportEvent, bouts: readonly OtherTournamentBout[]): EventBout[] {
  const out: EventBout[] = []
  const seen = new Set<string>()
  for (const bout of bouts) {
    const source = event.sources.find(
      (s) => s.eventKey === bout.eventKey && s.sourceFiles.includes(String(bout.sourceFile ?? "")),
    )
    if (!source) continue
    // The same bout from two files of one event (a state's own export beside the full bracket).
    const key = `${bout.eventKey}|${weightKey(bout.weight)}|${bout.round.toLowerCase()}|${norm(bout.opponentName)}|${bout.isBye}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...bout, source })
  }
  return out.sort((a, b) => a.boutOrder - b.boutOrder)
}

const ORDINAL = (n: number) => placementLabel(n) || `${n}th`

/** His place at the event, or why there is none. */
function derivePlacement(
  bouts: readonly EventBout[],
  verdicts: ReadonlyMap<string, BracketVerdict>,
  fieldName: (bout: EventBout) => string | null,
): { place: number | null; note: string | null } {
  const notes: string[] = []
  let best: number | null = null
  const entries = new Map<string, EventBout[]>()
  for (const b of bouts) {
    const key = bracketKey(b.eventKey, b.sourceFile, b.weight)
    entries.set(key, [...(entries.get(key) ?? []), b])
  }
  for (const [key, list] of entries) {
    const decisive = list.find((b) => !b.isBye && placementRound(b.round))
    const source = list[0]!.source
    if (!decisive) {
      if (list.some((b) => /^rr rnd/i.test(b.round)) && !list.some((b) => /quarter|semi|consi/i.test(b.round))) {
        notes.push("Round-robin pool with no placement match on file; no place can be computed")
      }
      continue
    }
    const [ifWon, ifLost] = placementRound(decisive.round)!
    const place = decisive.win ? ifWon : ifLost
    if (!source.placementsCount) {
      notes.push(`${ORDINAL(place)} in the ${source.bracketLabel ?? "secondary"} bracket, which is not a place at the tournament`)
      continue
    }
    const verdict = verdicts.get(key) ?? { kind: "single" as const }
    if (verdict.kind !== "single") {
      const name = fieldName(decisive)
      if (!name || !verdict.top.has(norm(name))) {
        notes.push(`${ORDINAL(place)} in a lower-tier bracket at this weight, which is not a place at the tournament`)
        continue
      }
      if (verdict.kind === "ambiguous") {
        notes.push(`${ORDINAL(place)} in one of two or more top brackets at this weight; no place at the tournament can be stated`)
        continue
      }
    }
    // A double-elimination placement match takes at most 0 (final), 1 (3rd) or 2 (5th, 7th) other losses.
    const otherLosses = list.filter((b) => b !== decisive && !b.isBye && !b.win).length
    if (otherLosses > maxPriorLosses(ifWon)) {
      notes.push(`A ${decisive.round} after ${otherLosses} other losses cannot be a main-bracket placement match; no place stated`)
      continue
    }
    if (best == null || place < best) best = place
  }
  return { place: best, note: best != null ? null : notes[0] ?? null }
}

/**
 * Where a round sits in a tournament, for listing his matches in an order a coach can follow. The
 * Super 32 export numbers a wrestler's bouts with the consolation rounds first, so bout order alone
 * read as if he wrestled back before he lost. Pools, then the championship side, then the
 * consolation side, then the placement matches.
 */
export function roundRank(round: string): number {
  const r = round.trim().toLowerCase()
  const n = (text: string | undefined) => Math.log2(Number(text) || 2)
  let m: RegExpExecArray | null
  if ((m = /^rr rnd (\d+)/.exec(r))) return Number(m[1])
  if ((m = /^round of (\d+)/.exec(r))) return 100 + (10 - n(m[1]))
  if (/^quarter/.test(r)) return 108
  if (/^semi/.test(r)) return 109
  if ((m = /^consi of (\d+)(?: #(\d+))?/.exec(r))) return 200 + (10 - n(m[1])) + Number(m[2] ?? 0) / 10
  if (/^consi-?semis?/.test(r)) return 208.5
  const place = placementRound(round)
  if (place) return 310 - place[0]
  return 150
}

function pronoun(gender: string | null, name: string): string {
  if (/^f/i.test(String(gender ?? "").trim())) return "She"
  if (/^m/i.test(String(gender ?? "").trim())) return "He"
  // No gender on file: the surname, never "they".
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] || name
}

function toSignificantBout(b: EventBout): Bout | null {
  return significantWinBout({
    is_bye: b.isBye,
    opponent_name: b.opponentName,
    opponent_club: b.opponentClub,
    win: b.win,
    win_type: b.winType,
    score: b.score,
    event_date: b.eventDate ?? null,
    event_name: b.eventName,
    weight_class: b.weight,
  })
}

export type ReportContext = {
  event: ReportEvent
  verdicts: ReadonlyMap<string, BracketVerdict>
  /** Bout -> the name the bracket file gives him, to place him in the bracket structure. */
  fieldName: (bout: OtherTournamentBout) => string | null
  /** The profile's opponent index for both boards; narrowed to his board here. Null: none loaded. */
  index: OpponentIndex | null
  /** Notable losses are coach-only. False leaves the list empty. */
  lossesVisible: boolean
}

export function buildAthleteEventReport(athlete: ReportAthleteInput, ctx: ReportContext): AthleteEventReport {
  const { event } = ctx
  const atEvent = eventBoutsFor(event, athlete.bouts)
  const shown = athlete.profileResults
  const onProfile = (b: EventBout) => {
    if (shown == null) return true
    const rows = shown.filter((r) => r.eventKey === b.eventKey)
    return rows.length === 1 || rows.some((r) => weightKey(r.weight) === weightKey(b.weight))
  }
  const unverifiedBouts = atEvent.filter((b) => !b.isBye && !onProfile(b)).length
  // No middle school results anywhere (Matt, 1 October 2026).
  const bouts = highSchoolBouts(
    atEvent.filter(onProfile).map((b) => ({ ...b, event_date: b.eventDate })),
    athlete.graduationYear,
  )
  const contested = bouts.filter((b) => !b.isBye)
  const base = {
    athleteId: athlete.id,
    name: athlete.name,
    classYear: athlete.graduationYear,
    gender: athlete.gender,
    school: athlete.school,
  }
  if (contested.length === 0) {
    return {
      ...base,
      competed: false,
      placement: null,
      place: null,
      placementNote: null,
      weight: null,
      record: { wins: 0, losses: 0 },
      bouts: [],
      significantWins: [],
      notableLosses: [],
      unverifiedBouts,
      opponentSideOnly: 0,
      summary: unverifiedBouts ? `No verified result at ${event.name}.` : `Did not compete at ${event.name}.`,
      strength: null,
    }
  }

  const wins = contested.filter((b) => b.win).length
  const losses = contested.length - wins
  const weights = [...new Set(contested.map((b) => b.weight.trim()).filter(Boolean))]
  const weight = weights.join(" / ") || null
  const { place, note } = derivePlacement(bouts, ctx.verdicts, ctx.fieldName)

  let significantWins: ReportResult[] = []
  let notableLosses: ReportResult[] = []
  if (ctx.index) {
    // "NC ranked" opponents from this wrestler's own board only: a ranked girl is not a boy's win.
    const index = rankedOnBoard(ctx.index, athlete.gender)
    const asBouts = contested.map(toSignificantBout).filter((b): b is Bout => b != null)
    significantWins = withAccoladesOnly(findSignificantWins(asBouts, index)).map((w) => ({
      opponent: w.opponent,
      opponentSchool: w.opponentSchool,
      result: w.result,
      weight: w.weight,
      credential: significantWinCredential(w),
    }))
    if (ctx.lossesVisible) {
      notableLosses = withAccoladesOnly(findSignificantLosses(asBouts, index)).map((l) => ({
        opponent: l.opponent,
        opponentSchool: l.opponentSchool,
        result: l.result,
        weight: l.weight,
        credential: notableLossCredential(l),
      }))
    }
  }

  const subject = pronoun(athlete.gender, athlete.name)
  const finish = place == null ? "" : place === 1 ? " and won the title" : ` and placed ${ORDINAL(place)}`
  return {
    ...base,
    competed: true,
    placement: place == null ? null : ORDINAL(place),
    place,
    placementNote: note,
    weight,
    record: { wins, losses },
    bouts: [...contested].sort((a, b) => roundRank(a.round) - roundRank(b.round) || a.boutOrder - b.boutOrder).map((b) => ({
      round: b.round,
      opponent: displayName(b.opponentName),
      opponentClub: b.opponentClub,
      outcome: b.win ? "W" : "L",
      method: b.winType || null,
      score: b.score || null,
      weight: b.weight,
      bracket: b.source.placementsCount ? null : (b.source.bracketLabel ?? "Secondary"),
    })),
    significantWins,
    notableLosses,
    unverifiedBouts,
    opponentSideOnly: 0,
    summary: `${subject} went ${wins}-${losses}${weight ? ` at ${weight}` : ""}${finish}.`,
    strength: athlete.strength?.grade && athlete.strength.line ? { grade: athlete.strength.grade, line: athlete.strength.line } : null,
  }
}

/** Best finish first, then the unplaced by wins, then those who did not compete; names break ties. */
export function compareReports(a: AthleteEventReport, b: AthleteEventReport): number {
  const tier = (r: AthleteEventReport) => (!r.competed ? 2 : r.place == null ? 1 : 0)
  return (
    tier(a) - tier(b) ||
    (a.place ?? 99) - (b.place ?? 99) ||
    b.record.wins - a.record.wins ||
    a.record.losses - b.record.losses ||
    a.name.localeCompare(b.name)
  )
}

/** The whole report for one coach's list. Every athlete passed in comes back, competed or not. */
export function buildEventReport(input: {
  event: ReportEvent
  athletes: readonly ReportAthleteInput[]
  field: readonly FieldRow[]
  index: OpponentIndex | null
  lossesVisible: boolean
}): AthleteEventReport[] {
  const verdicts = analyzeBrackets(input.event, input.field)
  const byBout = new Map<string, string>()
  for (const r of input.field) {
    byBout.set(`${r.eventKey}|${r.sourceFile ?? ""}|${weightKey(r.weight)}|${r.round.toLowerCase()}|${r.boutOrder}|${norm(r.opponentName)}`, r.athleteName)
  }
  const fieldName = (b: OtherTournamentBout) =>
    byBout.get(`${b.eventKey}|${b.sourceFile ?? ""}|${weightKey(b.weight)}|${b.round.toLowerCase()}|${b.boutOrder}|${norm(b.opponentName)}`) ?? null
  const ctx: ReportContext = { event: input.event, verdicts, fieldName, index: input.index, lossesVisible: input.lossesVisible }
  return input.athletes
    .map((a) => {
      const report = buildAthleteEventReport(a, ctx)
      if (!report.competed) return report
      // His bracket entries (file, weight, name) and the rounds he has his own row for.
      const mine = eventBoutsFor(input.event, a.bouts)
      const entries = new Map<string, { name: string; rounds: Set<string> }>()
      for (const b of mine) {
        const name = fieldName(b)
        if (!name) continue
        const key = bracketKey(b.eventKey, b.sourceFile, b.weight)
        const entry = entries.get(key) ?? { name: norm(name), rounds: new Set<string>() }
        entry.rounds.add(b.round.toLowerCase())
        entries.set(key, entry)
      }
      const opponentSideOnly = input.field.filter((r) => {
        const entry = entries.get(bracketKey(r.eventKey, r.sourceFile, r.weight))
        return entry && !r.isBye && norm(r.opponentName) === entry.name && !entry.rounds.has(r.round.toLowerCase())
      }).length
      return { ...report, opponentSideOnly }
    })
    .sort(compareReports)
}

/* ------------------------------------------------------------------ *
 * Email
 * ------------------------------------------------------------------ */

export const PROFILE_BASE_URL = "https://app.ncwrestlingunited.com"

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function resultLine(r: ReportResult, verb: "Beat" | "Lost to"): string {
  const who = `${esc(r.opponent)}${r.opponentSchool ? ` <span style="color:#64748b;">(${esc(r.opponentSchool)})</span>` : ""}`
  const how = r.result ? ` · ${esc(r.result)}` : ""
  const cred = r.credential ? `<br><span style="color:#9a7b2f;font-size:13px;">${esc(r.credential)}</span>` : ""
  return `<li style="margin:0 0 6px;">${verb} ${who}${how}${cred}</li>`
}

function athleteBlock(r: AthleteEventReport, event: ReportEvent): string {
  const url = `${PROFILE_BASE_URL}/athletes/${encodeURIComponent(r.athleteId)}`
  const facts = [r.classYear ? `Class of ${r.classYear}` : null, r.school].filter(Boolean).map(esc).join(" · ")
  const head = `<p style="margin:0;font-size:17px;font-weight:700;color:#0A1628;"><a href="${url}" style="color:#0A1628;text-decoration:none;">${esc(r.name)}</a></p>
${facts ? `<p style="margin:2px 0 8px;color:#64748b;font-size:13px;">${facts}</p>` : ""}`
  if (!r.competed) {
    return `<div style="border-top:1px solid #e2e8f0;padding:16px 0;">${head}
<p style="margin:0 0 8px;color:#475569;">${esc(r.summary)}</p>
<p style="margin:0;font-size:13px;"><a href="${url}" style="color:#003366;">View profile</a></p></div>`
  }
  const badge = r.placement
    ? `<span style="display:inline-block;background:#0A1628;color:#fff;border-radius:6px;padding:2px 8px;font-weight:700;font-size:13px;">${esc(r.placement)}</span>`
    : `<span style="display:inline-block;background:#e2e8f0;color:#334155;border-radius:6px;padding:2px 8px;font-weight:600;font-size:13px;">No place</span>`
  const stats = `<p style="margin:0 0 6px;">${badge} &nbsp;<strong>${r.record.wins}-${r.record.losses}</strong>${r.weight ? ` &nbsp;·&nbsp; ${esc(r.weight)} lb` : ""}</p>
<p style="margin:0 0 6px;color:#334155;">${esc(r.summary)}</p>`
  const note = r.placementNote ? `<p style="margin:0 0 8px;color:#64748b;font-size:13px;">${esc(r.placementNote)}.</p>` : ""
  const strength = r.strength
    ? `<p style="margin:0 0 8px;font-size:13px;"><strong style="color:#0A1628;">Strength of Competition: ${esc(r.strength.grade)}</strong> <span style="color:#64748b;">· ${esc(r.strength.line)}</span></p>`
    : ""
  const wins = r.significantWins.length
    ? `<p style="margin:8px 0 4px;font-weight:600;color:#0A1628;">Significant wins</p><ul style="margin:0;padding-left:18px;">${r.significantWins.map((w) => resultLine(w, "Beat")).join("")}</ul>`
    : `<p style="margin:8px 0 0;color:#64748b;font-size:13px;">No wins over a ranked or state-placing opponent on file at this event.</p>`
  const losses = r.notableLosses.length
    ? `<p style="margin:8px 0 4px;font-weight:600;color:#0A1628;">Notable losses</p><ul style="margin:0;padding-left:18px;">${r.notableLosses.map((l) => resultLine(l, "Lost to")).join("")}</ul>`
    : ""
  const matches = `<p style="margin:10px 0 4px;color:#64748b;font-size:12px;">${r.bouts
    .map((b) => `${esc(b.round)}${b.bracket ? ` (${esc(b.bracket)})` : ""}: ${b.outcome} ${esc(b.opponent)}${b.method || b.score ? ` ${esc([b.method, b.score].filter(Boolean).join(" "))}` : ""}`)
    .join("<br>")}</p>`
  return `<div style="border-top:1px solid #e2e8f0;padding:16px 0;">${head}${stats}${note}${strength}${wins}${losses}${matches}
<p style="margin:8px 0 0;font-size:13px;"><a href="${url}" style="color:#003366;">View full profile</a></p></div>`
}

/** Subject and inner HTML for one coach. Wrapped by the shared blast template to send or preview. */
export function renderCoachEventReportEmail(input: {
  event: ReportEvent
  coachName: string | null
  reports: readonly AthleteEventReport[]
}): { subject: string; bodyHtml: string } {
  const { event, reports } = input
  const competed = reports.filter((r) => r.competed)
  const placers = competed.filter((r) => r.place != null)
  const subject = `${event.name}: your ${reports.length} starred wrestler${reports.length === 1 ? "" : "s"}`
  const greeting = input.coachName ? `Coach ${esc(input.coachName.trim().split(/\s+/).slice(-1)[0])},` : "Coach,"
  const intro = `<p style="margin:0 0 12px;">${greeting}</p>
<p style="margin:0 0 12px;">Here is how the wrestlers you have starred did at <strong>${esc(event.name)}</strong>: ${competed.length} of ${reports.length} competed${placers.length ? `, ${placers.length} placed` : ""}. Best finishes first.</p>
<p style="margin:0 0 4px;color:#64748b;font-size:13px;">Records and placements are computed from the brackets. Significant wins and notable losses list only opponents with a ranking or a state or national placing on file. Notable losses are shared with college coaches only.</p>`
  return { subject, bodyHtml: intro + reports.map((r) => athleteBlock(r, event)).join("") }
}
