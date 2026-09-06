/**
 * "Other Tournaments" — qualifiers and open events that are NOT Super 32 itself.
 *
 * Super 32 Early Entry (the Super 32 Qualifier) is a separate tournament from Super 32.
 * These rows live in `other_tournament_results` / `other_tournament_bouts` and are shown in
 * their own profile section above Super 32; they never merge into `super32_results`.
 *
 * Rows are linked to a profile by `athlete_id` at import time, so reads here are an id
 * lookup rather than the name-guessing the older tournament tables have to do. A row with
 * no `athlete_id` is a wrestler we could not confidently identify — it stays in the table
 * for the event record and simply does not appear on anyone's profile.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { HEAD_TO_HEAD_WINDOW_DAYS } from "@/lib/head-to-head"
import type { Bout } from "@/lib/significant-wins"

export type OtherTournamentResult = {
  eventKey: string
  eventName: string
  eventShortName: string
  eventState: string | null
  eventDate: string | null
  year: number
  weight: string
  wins: number
  losses: number
  record: string
  /** 1-4, or null when the athlete competed without placing. */
  placement: number | null
  /** Top 4 — earns a chance to enter Super 32 when registration opens. */
  qualified: boolean
  entrants: number | null
  club: string | null
}

export type OtherTournamentBout = {
  eventKey: string
  eventName: string
  year: number
  weight: string
  round: string
  boutOrder: number
  opponentName: string | null
  opponentClub: string | null
  /** Set when the opponent also has a profile — this is a documented head-to-head. */
  opponentAthleteId: string | null
  win: boolean
  isBye: boolean
  winType: string
  score: string
}

/**
 * Bracket exports sometimes carry a name entirely in lower case ("mason brown"). Title-case
 * only those, so a profile does not read "beat mason brown" — a name with any capital is
 * left exactly as the bracket spelled it.
 */
export function displayName(raw: string | null | undefined): string {
  const name = String(raw ?? "").trim()
  if (!name || /[A-Z]/.test(name)) return name
  return name.replace(/(^|[\s\-'])([a-z])/g, (_, prefix: string, letter: string) => prefix + letter.toUpperCase())
}

/** Placement label for the shared placement badge ("" renders as the empty state). */
export function placementLabel(placement: number | null): string {
  if (placement == null) return ""
  if (placement === 1) return "Champion"
  if (placement === 2) return "2nd"
  if (placement === 3) return "3rd"
  return `${placement}th`
}

function toResult(row: Record<string, unknown>): OtherTournamentResult {
  const wins = Number(row.wins ?? 0)
  const losses = Number(row.losses ?? 0)
  return {
    eventKey: String(row.event_key ?? ""),
    eventName: String(row.event_name ?? ""),
    eventShortName: String(row.event_short_name ?? row.event_name ?? ""),
    eventState: (row.event_state as string) ?? null,
    eventDate: (row.event_date as string) ?? null,
    year: Number(row.year ?? 0),
    weight: String(row.weight_class ?? ""),
    wins,
    losses,
    record: String(row.record ?? `${wins}-${losses}`),
    placement: row.placement == null ? null : Number(row.placement),
    qualified: Boolean(row.qualified),
    entrants: row.entrants == null ? null : Number(row.entrants),
    club: (row.club as string) ?? null,
  }
}

function toBout(row: Record<string, unknown>): OtherTournamentBout {
  return {
    eventKey: String(row.event_key ?? ""),
    eventName: String(row.event_name ?? ""),
    year: Number(row.year ?? 0),
    weight: String(row.weight_class ?? ""),
    round: String(row.round ?? ""),
    boutOrder: Number(row.bout_order ?? 0),
    opponentName: (row.opponent_name as string) ?? null,
    opponentClub: (row.opponent_club as string) ?? null,
    opponentAthleteId: (row.opponent_id as string) ?? null,
    win: Boolean(row.win),
    isBye: Boolean(row.is_bye),
    winType: String(row.win_type ?? ""),
    score: String(row.score ?? ""),
  }
}

/** Newest event first, then heaviest weight, so a profile reads most-recent-first. */
function sortResults(a: OtherTournamentResult, b: OtherTournamentResult): number {
  const dateDiff = String(b.eventDate ?? b.year).localeCompare(String(a.eventDate ?? a.year))
  if (dateDiff) return dateDiff
  return Number(b.weight) - Number(a.weight)
}

export async function getOtherTournamentResultsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<OtherTournamentResult[]> {
  if (!athleteId?.trim()) return []
  const { data, error } = await supabase
    .from("other_tournament_results")
    .select("*")
    .eq("athlete_id", athleteId)
  if (error || !data) return []
  return data.map(toResult).sort(sortResults)
}

export async function getOtherTournamentBoutsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<OtherTournamentBout[]> {
  if (!athleteId?.trim()) return []
  const { data, error } = await supabase
    .from("other_tournament_bouts")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("bout_order", { ascending: true })
  if (error || !data) return []
  return data.map(toBout)
}

/* ------------------------------------------------------------------ *
 * Strength of wins
 * ------------------------------------------------------------------ */

/**
 * What makes a win over this opponent worth naming: how they finished at the same event,
 * plus who they are in our own data — a ranked wrestler, or someone in the TOC field.
 */
export type OpponentCredential = {
  name: string
  club: string | null
  placement: number | null
  record: string | null
  qualified: boolean
  /** RecruitNC prospect ranking, only when that class's rankings are published. */
  prospectRanking?: number | null
  graduationYear?: number | null
  /** Invited to or confirmed for the Tournament of Champions field. */
  tocParticipant?: boolean
}

/** Opponent facts that come from our own athlete data rather than the bracket. */
export type OpponentProfileFacts = {
  prospectRanking: number | null
  graduationYear: number | null
  tocParticipant: boolean
}

export type StrengthOfWin = {
  opponentName: string
  opponentClub: string | null
  round: string
  winType: string
  score: string
  /** Null when the opponent could not be resolved in the event's own result rows. */
  credential: OpponentCredential | null
  /** Ranks a win for display: beating a placer outranks beating an early-out. */
  weight: number
}

/**
 * Score one win by who it came against.
 *
 * A win over the champion is worth more than a win over someone who went 0-2, and a
 * bonus goes to bonus-point wins. This ordering is display-only — it decides which wins
 * lead the profile, not the athlete's ranking.
 */
export function scoreWin(credential: OpponentCredential | null, winType: string): number {
  let score = 0
  if (credential?.placement != null) score += Math.max(0, 60 - credential.placement * 10)
  else if (credential?.qualified) score += 20
  if (credential?.prospectRanking != null) score += Math.max(4, 34 - credential.prospectRanking)
  if (credential?.tocParticipant) score += 15
  if (credential?.record) {
    const wins = Number(credential.record.split("-")[0] ?? 0)
    if (Number.isFinite(wins)) score += Math.min(wins, 8) * 2
  }
  const bonus: Record<string, number> = { F: 5, TF: 4, MD: 3, DEC: 1 }
  score += bonus[winType.toUpperCase()] ?? 0
  return score
}

/**
 * A win worth calling out: it came against someone who placed at the event, qualified for
 * Super 32, is a ranked wrestler, or is in the TOC field.
 */
export function isNotableWin(credential: OpponentCredential | null): boolean {
  if (!credential) return false
  return (
    credential.placement != null ||
    credential.qualified ||
    credential.prospectRanking != null ||
    credential.tocParticipant === true
  )
}

/**
 * Annotate an athlete's wins with what their opponent did at the same event.
 * Byes and losses are dropped — this is the strength-of-wins list.
 */
export function buildStrengthOfWins(
  bouts: OtherTournamentBout[],
  credentials: Map<string, OpponentCredential>,
  /** Ranking / TOC facts for opponents who have a profile, keyed by athlete id. */
  profileFacts?: Map<string, OpponentProfileFacts>,
): StrengthOfWin[] {
  const wins: StrengthOfWin[] = []
  for (const bout of bouts) {
    if (!bout.win || bout.isBye || !bout.opponentName) continue
    const fromEvent = credentials.get(credentialKey(bout.eventKey, bout.opponentName, bout.opponentClub)) ?? null
    const facts = bout.opponentAthleteId ? profileFacts?.get(bout.opponentAthleteId) : undefined
    // An opponent with no event row can still be a credentialed win — they may be ranked
    // or in the TOC field even if we could not match their bracket row.
    const credential: OpponentCredential | null =
      fromEvent || facts
        ? {
            name: fromEvent?.name ?? displayName(bout.opponentName),
            club: fromEvent?.club ?? bout.opponentClub,
            placement: fromEvent?.placement ?? null,
            record: fromEvent?.record ?? null,
            qualified: fromEvent?.qualified ?? false,
            prospectRanking: facts?.prospectRanking ?? null,
            graduationYear: facts?.graduationYear ?? null,
            tocParticipant: facts?.tocParticipant ?? false,
          }
        : null
    wins.push({
      opponentName: displayName(bout.opponentName),
      opponentClub: bout.opponentClub,
      round: bout.round,
      winType: bout.winType,
      score: bout.score,
      credential,
      weight: scoreWin(credential, bout.winType),
    })
  }
  return wins.sort((a, b) => b.weight - a.weight || a.opponentName.localeCompare(b.opponentName))
}

/** Opponents are identified within an event by name + team, matching how results are keyed. */
export function credentialKey(eventKey: string, name: string, club: string | null | undefined): string {
  return `${eventKey}|${name.trim().toLowerCase()}|${String(club ?? "").trim().toLowerCase()}`
}

/** One event on a profile: the result, the bouts, and the wins worth naming. */
export type OtherTournamentProfileBlock = {
  result: OtherTournamentResult
  bouts: OtherTournamentBout[]
  strengthOfWins: StrengthOfWin[]
  /** Wins over placers and qualifiers, best first. */
  notableWins: StrengthOfWin[]
}

/** TOC statuses that mean the wrestler is in the field. A declined or withdrawn kid is not. */
const TOC_FIELD_STATUSES = ["invited", "confirmed"]

/**
 * Ranking and TOC-field facts for the opponents an athlete beat.
 *
 * A ranking only counts when that class's rankings are actually published and the number
 * is inside the published cap — the same rule the public rankings surfaces use, so a
 * profile never claims a win over "#41" that nobody can look up.
 */
export async function loadOpponentProfileFacts(
  supabase: SupabaseClient,
  opponentIds: string[],
): Promise<Map<string, OpponentProfileFacts>> {
  const facts = new Map<string, OpponentProfileFacts>()
  const ids = [...new Set(opponentIds.filter(Boolean))]
  if (ids.length === 0) return facts

  const [{ data: athletes }, { data: tocRows }] = await Promise.all([
    supabase.from("athletes").select("id, prospect_ranking, graduationyear").in("id", ids),
    supabase.from("toc_invitations").select("athlete_id, status").in("athlete_id", ids),
  ])

  const tocField = new Set(
    (tocRows ?? [])
      .filter((row) => TOC_FIELD_STATUSES.includes(String(row.status ?? "").toLowerCase()))
      .map((row) => String(row.athlete_id)),
  )

  for (const row of athletes ?? []) {
    const graduationYear = row.graduationyear == null ? null : Number(row.graduationyear)
    const rawRank = row.prospect_ranking == null ? null : Number(row.prospect_ranking)
    const published =
      rawRank != null &&
      Number.isFinite(rawRank) &&
      rawRank >= 1 &&
      isPublicRankingsYearPublished(graduationYear) &&
      rawRank <= getPublicRankingsMax(graduationYear)
    facts.set(String(row.id), {
      prospectRanking: published ? rawRank : null,
      graduationYear,
      tocParticipant: tocField.has(String(row.id)),
    })
  }
  for (const id of ids) {
    if (!facts.has(id)) {
      facts.set(id, { prospectRanking: null, graduationYear: null, tocParticipant: tocField.has(id) })
    }
  }
  return facts
}

/**
 * Everything the "Other Tournaments" profile section needs, in one call: results, the
 * athlete's bouts, and each win annotated with the opponent's finish at that same event.
 */
export async function getOtherTournamentProfileBlocks(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<OtherTournamentProfileBlock[]> {
  if (!athleteId?.trim()) return []
  const [results, bouts] = await Promise.all([
    getOtherTournamentResultsForAthlete(supabase, athleteId),
    getOtherTournamentBoutsForAthlete(supabase, athleteId),
  ])
  if (results.length === 0) return []

  const credentials = new Map<string, OpponentCredential>()
  const eventKeys = [...new Set(results.map((r) => r.eventKey))]
  const opponentNames = [...new Set(bouts.map((b) => b.opponentName).filter((n): n is string => Boolean(n)))]
  if (opponentNames.length > 0) {
    const { data } = await supabase
      .from("other_tournament_results")
      .select("event_key, athlete_name, club, placement, record, qualified")
      .in("event_key", eventKeys)
      .in("athlete_name", opponentNames)
    for (const row of data ?? []) {
      credentials.set(credentialKey(String(row.event_key), String(row.athlete_name), row.club as string), {
        name: String(row.athlete_name),
        club: (row.club as string) ?? null,
        placement: row.placement == null ? null : Number(row.placement),
        record: (row.record as string) ?? null,
        qualified: Boolean(row.qualified),
      })
    }
  }

  const profileFacts = await loadOpponentProfileFacts(
    supabase,
    bouts.map((b) => b.opponentAthleteId).filter((id): id is string => Boolean(id)),
  )

  return results.map((result) => {
    const eventBouts = bouts.filter((b) => b.eventKey === result.eventKey && b.weight === result.weight)
    const strengthOfWins = buildStrengthOfWins(eventBouts, credentials, profileFacts)
    return {
      result,
      bouts: eventBouts,
      strengthOfWins,
      notableWins: strengthOfWins.filter((win) => isNotableWin(win.credential)),
    }
  })
}

/**
 * Qualifier bouts in the shape the significant-wins list reads.
 *
 * That list was built against `matches` alone, so a win at a qualifier — a real win over a
 * ranked wrestler or someone in the TOC field — never showed up on the profile. Adam Walker
 * beat Luke Richards at the NC Early Entry and the section stayed empty of it.
 *
 * Windowed to the same 12 months as head-to-head: this is a claim about who somebody is
 * beating now, and last year's qualifier is a different claim.
 */
export async function getQualifierSignificantWinBouts(
  supabase: SupabaseClient,
  athleteId: string,
  /** "wins" for the profile list; "all" for a scouting report, which names losses too. */
  include: "wins" | "all" = "wins",
): Promise<Bout[]> {
  if (!athleteId?.trim()) return []
  let query = supabase
    .from("other_tournament_bouts")
    .select("opponent_name, opponent_club, win, is_bye, win_type, score, weight_class, event_name, event_date")
    .eq("athlete_id", athleteId)
  if (include === "wins") query = query.eq("win", true)
  const { data, error } = await query
  if (error || !data) return []

  const cutoff = Date.now() - HEAD_TO_HEAD_WINDOW_DAYS * 86_400_000
  const out: Bout[] = []
  for (const row of data) {
    if (row.is_bye || !row.opponent_name) continue
    const at = row.event_date ? Date.parse(String(row.event_date)) : NaN
    if (Number.isFinite(at) && at < cutoff) continue
    out.push({
      opponent: displayName(String(row.opponent_name)),
      opponent_school: (row.opponent_club as string) ?? null,
      win_loss: row.win ? "W" : "L",
      result: [row.win_type, row.score].filter(Boolean).join(" ").trim() || null,
      date: (row.event_date as string) ?? null,
      venue: (row.event_name as string) ?? null,
      weight: (row.weight_class as string) ?? null,
    })
  }
  return out
}

/** One meeting between two wrestlers, dated so the most recent one can be weighed highest. */
export type QualifierMeeting = {
  /** Epoch ms of the event date, or null when the event carried no date. */
  at: number | null
  won: boolean
  summary: string
}

/** One pairing's qualifier head-to-head, for TOC seeding. */
export type QualifierHeadToHead = {
  wins: number
  losses: number
  /** The meeting furthest into the bracket, phrased for a seeding note. */
  summary: string
  /** Every meeting, so seeding can weigh the latest one highest. */
  meetings: QualifierMeeting[]
}

/** athleteId -> opponentId -> head-to-head at qualifier events. */
export type QualifierHeadToHeadIndex = Map<string, Map<string, QualifierHeadToHead>>

function meetingSummary(bout: {
  win: boolean
  win_type?: string | null
  score?: string | null
  round?: string | null
  event_name?: string | null
  year?: number | null
}): string {
  const outcome = bout.win ? "won" : "lost"
  const how = [bout.win_type, bout.score].filter(Boolean).join(" ").trim()
  const where = [bout.round, bout.event_name, bout.year].filter(Boolean).join(", ")
  return `${outcome}${how ? ` ${how}` : ""}${where ? ` — ${where}` : ""}`
}

/**
 * Head-to-head between a given set of athletes at qualifier events, keyed by athlete id.
 *
 * Seeding is the one place where guessing at names is not good enough: flipping a seed on a
 * mistaken identity puts the wrong kid on the wrong line of a published bracket. These rows
 * carry `athlete_id` and `opponent_id` resolved at import, so pairings here are exact.
 *
 * Only the most recent year of qualifier results counts, matching the rule the rest of TOC
 * head-to-head already follows: this is an argument about who is beating whom now, and a
 * result from a previous season at a different weight is not evidence about this bracket.
 */
export async function loadQualifierHeadToHead(
  supabase: SupabaseClient,
  athleteIds: string[],
): Promise<QualifierHeadToHeadIndex> {
  const index: QualifierHeadToHeadIndex = new Map()
  const ids = [...new Set(athleteIds.filter(Boolean))]
  if (ids.length < 2) return index

  const { data, error } = await supabase
    .from("other_tournament_bouts")
    .select("athlete_id, opponent_id, win, is_bye, round, bout_order, win_type, score, event_name, event_date, year")
    .in("athlete_id", ids)
  if (error || !data) return index

  const inField = new Set(ids)
  const bestRound = new Map<string, number>()

  const years = data.map((row) => Number(row.year)).filter((year) => Number.isFinite(year))
  const latestYear = years.length ? Math.max(...years) : null

  for (const row of data) {
    if (latestYear != null && Number(row.year) !== latestYear) continue
    const athleteId = row.athlete_id ? String(row.athlete_id) : ""
    const opponentId = row.opponent_id ? String(row.opponent_id) : ""
    if (!athleteId || !opponentId || row.is_bye) continue
    if (!inField.has(athleteId) || !inField.has(opponentId)) continue

    let byOpponent = index.get(athleteId)
    if (!byOpponent) {
      byOpponent = new Map()
      index.set(athleteId, byOpponent)
    }
    const entry = byOpponent.get(opponentId) ?? { wins: 0, losses: 0, summary: "", meetings: [] }
    if (row.win) entry.wins += 1
    else entry.losses += 1

    const summary = meetingSummary({
      win: Boolean(row.win),
      win_type: row.win_type as string,
      score: row.score as string,
      round: row.round as string,
      event_name: row.event_name as string,
      year: row.year as number,
    })
    const parsedDate = row.event_date ? Date.parse(String(row.event_date)) : NaN
    entry.meetings.push({
      at: Number.isFinite(parsedDate) ? parsedDate : null,
      won: Boolean(row.win),
      summary,
    })

    // Keep the meeting that went furthest in the bracket as the note.
    const key = `${athleteId}|${opponentId}`
    const order = Number(row.bout_order ?? 0)
    if (!entry.summary || order >= (bestRound.get(key) ?? -1)) {
      bestRound.set(key, order)
      entry.summary = summary
    }
    byOpponent.set(opponentId, entry)
  }

  return index
}

/**
 * Head-to-head against other athletes we have profiles for, aggregated across every
 * "other tournament" bout. Used for seeding and for the direct-wins signal in rankings.
 */
export type DirectResultSummary = {
  opponentAthleteId: string
  opponentName: string
  wins: number
  losses: number
  bouts: OtherTournamentBout[]
}

export function summarizeDirectResults(bouts: OtherTournamentBout[]): DirectResultSummary[] {
  const byOpponent = new Map<string, DirectResultSummary>()
  for (const bout of bouts) {
    if (bout.isBye || !bout.opponentAthleteId || !bout.opponentName) continue
    let entry = byOpponent.get(bout.opponentAthleteId)
    if (!entry) {
      entry = {
        opponentAthleteId: bout.opponentAthleteId,
        opponentName: displayName(bout.opponentName),
        wins: 0,
        losses: 0,
        bouts: [],
      }
      byOpponent.set(bout.opponentAthleteId, entry)
    }
    if (bout.win) entry.wins += 1
    else entry.losses += 1
    entry.bouts.push(bout)
  }
  return [...byOpponent.values()].sort(
    (a, b) => b.wins + b.losses - (a.wins + a.losses) || a.opponentName.localeCompare(b.opponentName),
  )
}
