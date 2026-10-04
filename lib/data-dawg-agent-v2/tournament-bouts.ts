/**
 * Bout-level tournament results, for Data Dawg.
 *
 * Data Dawg knew records and placements and never a single opponent. It could say Carson Worrick
 * went 7-2 and placed fourth at NHSCA and could not answer "who did he beat", "has he ever
 * wrestled Tobin McNair", or "who has beaten the top of the 2027 class" — the questions a coach
 * actually asks. `other_tournament_bouts` has held that detail for the TOC, Super 32 Early Entry,
 * I-64, Journeymen, NHSCA Duals, the state tournament and now NHSCA Nationals; nothing was
 * reading it.
 *
 * Head-to-head is its own question rather than a filter on a search. "Did A ever beat B" has a
 * yes or no answer and a date, and a list of rows that happens to contain the answer is not the
 * same thing — the most recent meeting is what decides a ranking argument, so it is stated.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

export type BoutRow = {
  event: string
  year: number | null
  date: string | null
  round: string | null
  weight: string | null
  opponent: string
  opponentTeam: string | null
  outcome: "W" | "L"
  method: string | null
  score: string | null
}

export type HeadToHeadAnswer = {
  wrestler: string
  opponent: string
  meetings: BoutRow[]
  record: string
  /** Who won when they last met, which is what a ranking argument turns on. */
  lastMeeting: { winner: string; event: string; date: string | null; result: string } | null
  summary: string
}

export function toBoutRow(raw: Record<string, unknown>): BoutRow {
  return {
    event: String(raw.event_name ?? "").trim() || "Unknown event",
    year: Number.isFinite(Number(raw.year)) ? Number(raw.year) : null,
    date: String(raw.event_date ?? "").trim() || null,
    round: String(raw.round ?? "").trim() || null,
    weight: String(raw.weight_class ?? "").trim() || null,
    opponent: String(raw.opponent_name ?? "").trim(),
    opponentTeam: String(raw.opponent_club ?? "").trim() || null,
    outcome: raw.win ? "W" : "L",
    method: String(raw.win_type ?? "").trim() || null,
    score: String(raw.score ?? "").trim() || null,
  }
}

/** "beat Tobin McNair DEC 3-2 at 2026 NHSCA High School Nationals (Consi-Semis)" */
export function describeBout(bout: BoutRow, subject?: string): string {
  const verb = bout.outcome === "W" ? "beat" : "lost to"
  const how = [bout.method, bout.score].filter(Boolean).join(" ")
  const where = [bout.event, bout.round ? `(${bout.round})` : ""].filter(Boolean).join(" ")
  return `${subject ? `${subject} ` : ""}${verb} ${bout.opponent}${how ? ` ${how}` : ""}${where ? ` at ${where}` : ""}`
}

export function buildHeadToHead(wrestler: string, opponent: string, meetings: BoutRow[]): HeadToHeadAnswer {
  const sorted = [...meetings].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
  const wins = sorted.filter((m) => m.outcome === "W").length
  const losses = sorted.length - wins
  const latest = sorted[0] ?? null
  const lastMeeting = latest
    ? {
        winner: latest.outcome === "W" ? wrestler : opponent,
        event: latest.event,
        date: latest.date,
        result: [latest.method, latest.score].filter(Boolean).join(" ") || "result unrecorded",
      }
    : null
  const summary = !sorted.length
    ? `No recorded meeting between ${wrestler} and ${opponent}. That means none is on file, not that none happened — bout-level data exists only for the events we have imported.`
    : `${wrestler} is ${wins}-${losses} against ${opponent}. Most recently ${lastMeeting!.winner} won${lastMeeting!.date ? ` on ${lastMeeting!.date}` : ""} at ${lastMeeting!.event}.`
  return { wrestler, opponent, meetings: sorted, record: `${wins}-${losses}`, lastMeeting, summary }
}

const SELECT = "event_name,year,event_date,round,weight_class,opponent_name,opponent_club,win,win_type,score,athlete_id"

/**
 * Each event's record and finish, worked out from the bouts.
 *
 * A reader wants "5th at NHSCA 2025, 7-3" before a list of ten matches; the list alone makes them
 * count. For a wrestler with no profile there is no placement row to read, so the finish comes
 * from the placement rounds the same way scripts/import-national-event-placers.py derives it:
 * winning the 3rd-place match is third, losing it is fourth.
 */
const PLACEMENT_ROUNDS: Array<[RegExp, number, number]> = [
  [/1st place|^finals$|championship final/i, 1, 2],
  [/3rd place/i, 3, 4],
  [/5th place/i, 5, 6],
  [/7th place/i, 7, 8],
]

export type EventSummary = {
  event: string
  year: number | null
  weight: string | null
  wins: number
  losses: number
  record: string
  /** Null when the wrestler did not reach a placement match — not a claim that he did not place. */
  placement: number | null
}

export function summarizeBoutsByEvent(bouts: BoutRow[]): EventSummary[] {
  const byEvent = new Map<string, BoutRow[]>()
  for (const b of bouts) {
    const key = `${b.year ?? ""}|${b.event}`
    byEvent.set(key, [...(byEvent.get(key) ?? []), b])
  }
  return [...byEvent.values()]
    .map((list): EventSummary => {
      const wins = list.filter((b) => b.outcome === "W").length
      let placement: number | null = null
      for (const b of list) {
        const hit = PLACEMENT_ROUNDS.find(([re]) => re.test(String(b.round ?? "")))
        if (!hit) continue
        placement = b.outcome === "W" ? hit[1] : hit[2]
        break
      }
      return {
        event: list[0]!.event,
        year: list[0]!.year,
        weight: list.find((b) => b.weight)?.weight ?? null,
        wins,
        losses: list.length - wins,
        record: `${wins}-${list.length - wins}`,
        placement,
      }
    })
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.event.localeCompare(b.event))
}

/**
 * A wrestler we hold results for but no profile.
 *
 * Since the national imports kept every state, `other_tournament_bouts` carries roughly ten
 * thousand wrestlers who exist only as a name and a team: Micah Engelman of Pennsylvania has his
 * whole two-year NHSCA record here, 16 bouts and two fifth places, and no `athlete_id`. Every tool
 * keyed on a profile id, so Data Dawg answered "no athlete found" while holding the answer —
 * confidently empty, which is worse than saying nothing.
 *
 * Matched on name AND team, never name alone. Two wrestlers of a name in different states are two
 * people, and merging them would invent a record neither of them has. Where the name appears under
 * more than one team the caller is told, rather than one being picked.
 */
export type UnprofiledWrestler = { name: string; teams: Array<{ team: string; bouts: number }> }

export async function findUnprofiledWrestler(
  supabase: SupabaseClient,
  name: string,
): Promise<UnprofiledWrestler | null> {
  const q = name.trim()
  if (q.length < 2) return null
  const { data, error } = await supabase
    .from("other_tournament_bouts")
    .select("athlete_name,athlete_club")
    .is("athlete_id", null)
    .ilike("athlete_name", q)
    .limit(200)
  if (error || !data?.length) return null
  /*
   * Counted per team, because the same wrestler is often recorded two ways: NHSCA and Fargo store
   * a state code and USAW and Journeymen a club, so "Wyoming Seminary" and "PA" can be one person.
   * The caller is given the counts rather than a bare list, so the question it asks is answerable.
   */
  const counts = new Map<string, number>()
  for (const r of data) {
    const team = String(r.athlete_club ?? "").trim()
    if (team) counts.set(team, (counts.get(team) ?? 0) + 1)
  }
  const teams = [...counts.entries()]
    .map(([team, bouts]) => ({ team, bouts }))
    .sort((a, b) => b.bouts - a.bouts)
  return { name: String(data[0]!.athlete_name ?? q).trim() || q, teams }
}

/** That wrestler's bouts, keyed on the name and team rather than a profile. */
export async function loadBoutsForUnprofiled(
  supabase: SupabaseClient,
  name: string,
  team: string | null,
  options: { event?: string | null; year?: number | null; limit?: number } = {},
): Promise<BoutRow[]> {
  let query = supabase.from("other_tournament_bouts").select(SELECT).is("athlete_id", null).ilike("athlete_name", name)
  if (team) query = query.eq("athlete_club", team)
  if (options.event) query = query.ilike("event_name", `%${options.event}%`)
  if (options.year) query = query.eq("year", options.year)
  const { data, error } = await query
    .order("year", { ascending: false })
    .order("bout_order", { ascending: true })
    .limit(Math.min(Math.max(options.limit ?? 60, 1), 200))
  if (error || !data) return []
  return data.map((row) => toBoutRow(row as Record<string, unknown>))
}

/** Every recorded bout for one athlete, newest first. */
export async function loadBoutsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
  options: { event?: string | null; year?: number | null; limit?: number } = {},
): Promise<BoutRow[]> {
  let query = supabase.from("other_tournament_bouts").select(SELECT).eq("athlete_id", athleteId)
  if (options.event) query = query.ilike("event_name", `%${options.event}%`)
  if (options.year) query = query.eq("year", options.year)
  const { data, error } = await query
    .order("year", { ascending: false })
    .order("bout_order", { ascending: true })
    .limit(Math.min(Math.max(options.limit ?? 60, 1), 200))
  if (error || !data) return []
  return data.map((row) => toBoutRow(row as Record<string, unknown>))
}

/** Meetings between two athletes, read from the first one's bouts. */
export async function loadMeetings(
  supabase: SupabaseClient,
  athleteId: string,
  opponentName: string,
): Promise<BoutRow[]> {
  const { data, error } = await supabase
    .from("other_tournament_bouts")
    .select(SELECT)
    .eq("athlete_id", athleteId)
    .ilike("opponent_name", `%${opponentName}%`)
    .order("year", { ascending: false })
  if (error || !data) return []
  return data.map((row) => toBoutRow(row as Record<string, unknown>))
}
