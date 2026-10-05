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
const US_STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
  connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
  illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
  tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
}

/**
 * A state named in the question, pulled out of the name.
 *
 * "elijah brown from new york" is a name the table does not hold and a state that decides which
 * Elijah Brown is meant — there is one in New York and another in Indiana, besides the North
 * Carolinian in our own tables. Separating them makes the question answerable and the answer right.
 */
export function splitNameAndState(phrase: string): { name: string; state: string | null } {
  let text = ` ${String(phrase ?? "").toLowerCase().replace(/\s+/g, " ").trim()} `
  let state: string | null = null
  for (const [full, code] of Object.entries(US_STATES)) {
    const re = new RegExp(`\\b(from |in )?${full}\\b`, "i")
    if (re.test(text)) {
      state = code
      text = text.replace(re, " ")
      break
    }
  }
  if (!state) {
    // Lower-cased above, so match the code case-insensitively: "micah engelman pa".
    const code = text.match(/\b(?:from |in )?([a-z]{2})\b\s*$/i)
    const upper = code?.[1]?.toUpperCase()
    if (upper && Object.values(US_STATES).includes(upper)) {
      state = upper
      text = text.replace(code![0], " ")
    }
  }
  return { name: text.replace(/\s+/g, " ").trim(), state }
}

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
  let teams = [...counts.entries()]
    .map(([team, bouts]) => ({ team, bouts }))
    .sort((a, b) => b.bouts - a.bouts)
  /*
   * One state code among clubs is one wrestler recorded two ways, not two wrestlers.
   *
   * NHSCA, Super 32 and Fargo store the state; the duals and USAW store the club. Colten Jones
   * appears as "VA" and as "Integrity" and is a single person with 37 bouts, so asking which was
   * a question with no right answer. Two different state codes stay ambiguous — those really are
   * two people.
   */
  const stateCodes = teams.filter((t) => /^[A-Z]{2}$/.test(t.team.toUpperCase()))
  if (stateCodes.length === 1 && teams.length > 1) teams = stateCodes
  return { name: String(data[0]!.athlete_name ?? q).trim() || q, teams }
}

/** That wrestler's bouts, keyed on the name and team rather than a profile. */
export async function loadBoutsForUnprofiled(
  supabase: SupabaseClient,
  name: string,
  team: string | null,
  options: { event?: string | null; year?: number | null; limit?: number; names?: string[] } = {},
): Promise<BoutRow[]> {
  // Not filtered to the team: where a wrestler is recorded as a state at one event and a club at
  // another, filtering would drop half his record. The team identifies him; it does not limit him.
  /*
   * Searched under every spelling the identity registry knows, not just the one asked for. Will
   * Clanton of New York is also recorded as William Clanton, and a single-name query returned
   * half his record as though the other half did not exist. 257 wrestlers were split this way.
   */
  const spellings = (options.names ?? []).filter((n) => String(n ?? "").trim())
  const query0 =
    spellings.length > 1
      ? supabase.from("other_tournament_bouts").select(SELECT).is("athlete_id", null).in("athlete_name", spellings)
      : supabase.from("other_tournament_bouts").select(SELECT).is("athlete_id", null).ilike("athlete_name", name)
  let query = query0
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


/**
 * The four things people actually ask about one wrestler, in the order they ask them.
 *
 * Matt, 4 Oct 2026: say which state he is from first, then whether he placed at his own state
 * tournament, then NHSCA, Super 32 and Fargo freestyle with records, for every year we hold.
 * Built here rather than described to the model: an order left to a model is an order it follows
 * most of the time, and "most of the time" is what produced a different Elijah Brown between one
 * message and the next.
 *
 * An event with no entry is reported as such by the caller. Silence about Super 32 reads as "he
 * never went", which is a claim we cannot make.
 */
export type CareerSummary = {
  state: string | null
  stateTournament: Array<{ year: number | null; state: string; classification: string | null; weight: string | null; place: number | null }>
  nhsca: EventSummary[]
  super32: EventSummary[]
  fargoFreestyle: EventSummary[]
  fargoGreco: EventSummary[]
  other: EventSummary[]
  /*
   * Career totals per event, worked out here so the model never adds.
   *
   * Asked for Dustin Kohn's NHSCA record it summed 2-2, 6-2, 3-2 and 6-3 and announced "18-11".
   * It is 17-9. Arithmetic in the prose is arithmetic nobody checks, so the string it should
   * print is handed to it finished, and null means we hold nothing — not a 0-0.
   */
  careerRecords: {
    nhsca: string | null
    super32: string | null
    fargoFreestyle: string | null
    fargoGreco: string | null
  }
  /*
   * The five answers, already written.
   *
   * Told in the prompt not to claim attendance for an empty section, the model still reported that
   * Nick Meza "has participated in the NHSCA Nationals, but we do not have any recorded results".
   * He may never have entered; the section is empty because the import does not reach him. That
   * was the third time today a rule about phrasing lost to a sentence the model preferred, so the
   * sentence is written here and the model is given it rather than told about it.
   */
  lines: string[]
}

function totalRecord(events: EventSummary[]): string | null {
  if (!events.length) return null
  let wins = 0
  let losses = 0
  for (const e of events) {
    wins += Number(e.wins ?? 0) || 0
    losses += Number(e.losses ?? 0) || 0
  }
  return `${wins}-${losses}`
}

export function buildCareerSummary(
  state: string | null,
  statePlacements: Array<{ state?: string; season?: number | null; classification?: string | null; weight?: string | null; place?: number | null }>,
  events: EventSummary[],
): CareerSummary {
  const newestFirst = (a: EventSummary, b: EventSummary) => (b.year ?? 0) - (a.year ?? 0)
  const is = (re: RegExp) => (e: EventSummary) => re.test(e.event)
  // Greco is named in the event; everything else at Fargo is freestyle.
  const fargo = events.filter(is(/fargo/i))
  /*
   * The NHSCA National Duals is not the NHSCA Nationals, so it is kept out of the nhsca bucket.
   * `other` used to re-list the same regexes to exclude, which meant the duals matched /nhsca/
   * there too and fell through every bucket — a wrestler whose only event was the duals got a
   * summary with nothing in it at all. So `other` is whatever the named buckets did not take,
   * by identity, and adding a bucket can no longer silently drop an event.
   */
  const nhsca = events.filter(is(/nhsca/i)).filter((e) => !/duals/i.test(e.event)).sort(newestFirst)
  const super32 = events.filter(is(/super 32|super32/i)).sort(newestFirst)
  const claimed = new Set<EventSummary>([...nhsca, ...super32, ...fargo])
  const summary: CareerSummary = {
    state,
    stateTournament: statePlacements
      .map((p) => ({
        year: p.season ?? null,
        state: String(p.state ?? state ?? ""),
        classification: p.classification ?? null,
        weight: p.weight ?? null,
        place: p.place ?? null,
      }))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
    nhsca,
    super32,
    fargoFreestyle: fargo.filter((e) => !/greco/i.test(e.event)).sort(newestFirst),
    fargoGreco: fargo.filter(is(/greco/i)).sort(newestFirst),
    other: events.filter((e) => !claimed.has(e)).sort(newestFirst),
    careerRecords: {
      nhsca: totalRecord(nhsca),
      super32: totalRecord(super32),
      fargoFreestyle: totalRecord(fargo.filter((e) => !/greco/i.test(e.event))),
      fargoGreco: totalRecord(fargo.filter(is(/greco/i))),
    },
    lines: [],
  }
  summary.lines = careerSummaryLines(summary)
  return summary
}

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"]
const place = (n: number | null) => (n && ORDINAL[n] ? ORDINAL[n] : n ? `${n}th` : null)

/**
 * One finished sentence per section, in the order people ask in: state, his own state tournament,
 * NHSCA, Super 32, Fargo freestyle. An empty section says we hold nothing and says nothing about
 * whether he entered, because we do not know.
 */
function careerSummaryLines(c: CareerSummary): string[] {
  const years = (events: EventSummary[]) =>
    events
      .map((e) => {
        const finish = place(e.placement)
        return `${e.year} at ${e.weight} (${e.record}${finish ? `, ${finish}` : ""})`
      })
      .join("; ")
  const section = (label: string, events: EventSummary[], total: string | null) =>
    events.length
      ? `${label}: ${total} overall — ${years(events)}.`
      /*
       * A statement of what we hold, with no instruction in it: these lines are meant to be
       * printed, and an imperative here comes out in the answer addressed to the reader.
       */
      : `${label}: none on file — we hold no ${label} results for this wrestler.`

  const lines: string[] = []
  lines.push(c.state ? `Wrestles for ${c.state}.` : "No state on file for this wrestler.")
  if (c.stateTournament.length) {
    lines.push(
      `State tournament: ${c.stateTournament
        .map((p) => {
          const finish = place(p.place)
          const division = p.classification ? ` ${p.classification}` : ""
          return `${p.year} ${p.state}${division} at ${p.weight} — ${finish ?? "placed"}${p.place === 1 ? " (champion)" : ""}`
        })
        .join("; ")}.`,
    )
  } else {
    lines.push(
      "State tournament: none on file — we hold no state placement for this wrestler. Outside North Carolina our collection covers the 2026 season only.",
    )
  }
  lines.push(section("NHSCA Nationals", c.nhsca, c.careerRecords.nhsca))
  lines.push(section("Super 32", c.super32, c.careerRecords.super32))
  lines.push(section("Fargo freestyle", c.fargoFreestyle, c.careerRecords.fargoFreestyle))
  if (c.fargoGreco.length) {
    lines.push(`Fargo Greco-Roman: ${c.careerRecords.fargoGreco} overall — ${years(c.fargoGreco)}.`)
  }
  if (c.other.length) {
    lines.push(`Also on file: ${c.other.map((e) => `${e.year} ${e.event} (${e.record})`).join("; ")}.`)
  }
  return lines
}
