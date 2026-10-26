/**
 * Turning the bout stores into one list of contested bouts between people.
 *
 * Three things the raw rows get wrong for rating purposes, each handled here:
 *  - National brackets store every bout twice, once from each wrestler's side. Counted as is, a
 *    wrestler's rating would move twice per match.
 *  - Forfeits, byes, injury and medical defaults, and DQs say nothing about who is better.
 *  - About a third of national rows carry no event_date, so an event date is filled from the
 *    event's own calendar (EVENT_DEFAULT_DATES) — order matters to a rating, the day does not.
 *
 * People: a bout side reaches a person through identity_aliases (the bout store's (name, team)),
 * and a state-tournament placement bout through (name, state, gender) on athlete_identities,
 * which was minted from those very placers. Nothing is matched on name alone across states.
 */
import { nameWords } from "@/lib/athlete-name-match"

export type Side = {
  /** identity id, or a read-time "u:" key for a wrestler the registry does not hold. */
  key: string
  identified: boolean
  name: string
  /** Two-letter state where the source says it, else null. */
  state: string | null
}

export type Bout = {
  eventKey: string
  eventFamily: string
  date: string
  weight: string
  round: string | null
  winner: Side
  loser: Side
  method: string | null
  gender: "M" | "F" | null
}

/** Win types that are not a contested result. Compared upper-cased, spaces kept. */
const NOT_CONTESTED = new Set([
  "BYE", "FF", "FOR", "FORFEIT", "M FOR", "MFF", "MFFL", "VFO", "VFO1",
  "INJ", "VIN", "ID", "DEF", "MED", "MD FOR", "FMC",
  "DQ", "VCA", "RULE", "NC",
])

export function isContested(winType: string | null | undefined, isBye = false): boolean {
  if (isBye) return false
  const t = String(winType ?? "").trim().toUpperCase()
  if (!t) return true
  return !NOT_CONTESTED.has(t)
}

export type EventTier = "national" | "state" | "open"

/**
 * What showing up at an event says about a wrestler before he wrestles. A national field is
 * selected; a state bracket is everyone who qualified in one state; an open club event is
 * anyone. A first appearance is rated from this (see BacktestOptions.debutOffset), because a
 * newcomer at a state tournament is not, on average, the equal of a national entrant.
 */
export function eventTier(eventKey: string): EventTier {
  const f = eventFamily(eventKey)
  if (["Super 32", "NHSCA Nationals", "Fargo", "USAW Women's Nationals"].includes(f)) return "national"
  if (["NCHSAA States", "VA/SC/MD state brackets", "State placement bouts"].includes(f) || championshipState(eventKey)) return "state"
  return "open"
}

export function eventFamily(eventKey: string): string {
  const k = eventKey.toLowerCase()
  if (k.startsWith("super32-early-entry")) return "Early Entry"
  if (k.startsWith("super32")) return "Super 32"
  if (k.startsWith("nhsca-nationals")) return "NHSCA Nationals"
  if (k.startsWith("fargo")) return "Fargo"
  if (k.startsWith("journeymen-womens")) return "Journeymen Women's"
  if (k.startsWith("journeymen")) return "Journeymen Fall Classic"
  if (k.startsWith("nchsaa-states")) return "NCHSAA States"
  if (k.startsWith("state:")) return "State placement bouts"
  if (/^(vhsl|visaa|schsl|scisa|mpssaa|miaa|mis)-states/.test(k)) return "VA/SC/MD state brackets"
  if (k.startsWith("usaw-womens-nationals")) return "USAW Women's Nationals"
  return "Other (duals, USAW states, TOC)"
}

/** Calendar dates for events whose rows carry none (lib/scouting-report.ts EVENT_MONTH). */
export function defaultEventDate(eventKey: string, year: number): string {
  const k = eventKey.toLowerCase()
  if (k.startsWith("nhsca-nationals")) return `${year}-03-27`
  if (k.startsWith("super32-early-entry")) return `${year}-09-06`
  if (k.startsWith("super32")) return `${year}-10-19`
  if (/^(vhsl|visaa|schsl|scisa|mpssaa|miaa|mis)-states/.test(k) || k.startsWith("state:")) return `${year}-02-21`
  if (k.startsWith("usaw-womens-nationals")) return `${year}-04-15`
  if (k.startsWith("fargo")) return `${year}-07-15`
  if (k.startsWith("journeymen")) return `${year}-10-04`
  return `${year}-06-01`
}

export const normName = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

/** The team value identity_aliases is keyed on: a state code upper-cased, a club as written. */
export function aliasTeam(club: unknown): { team: string; state: string | null } {
  const t = String(club ?? "").trim()
  if (/^[A-Za-z]{2}$/.test(t)) return { team: t.toUpperCase(), state: t.toUpperCase() }
  return { team: t, state: null }
}

export type AliasIndex = Map<string, string>

/** `${alias_name_raw}|${alias_team}` -> identity_id, linked aliases only. */
export function buildAliasIndex(
  aliases: Array<{ identity_id: string; alias_name_raw: string; alias_team: string | null; status: string }>,
): AliasIndex {
  const m: AliasIndex = new Map()
  for (const a of aliases) {
    if (a.status !== "linked" || !a.identity_id) continue
    m.set(`${String(a.alias_name_raw).trim()}|${a.alias_team ?? ""}`, a.identity_id)
  }
  return m
}

export type OtherTournamentRow = {
  event_key: string
  year: number
  weight_class: string | null
  round: string | null
  athlete_name: string | null
  athlete_club: string | null
  opponent_name: string | null
  opponent_club: string | null
  win: boolean | null
  is_bye: boolean | null
  win_type: string | null
  event_date: string | null
  gender: string | null
}

export type BuildOptions = {
  /**
   * Rate wrestlers the registry does not hold under a read-time (name, state) key, or (name,
   * club) where no state is known. Never stored as a person (identity-registry-scope): it exists
   * only inside one rating run.
   */
  includeUnidentified: boolean
}

/**
 * The state a bracket belongs to when the event IS a state championship — NCHSAA, VHSL, SCHSL
 * and the rest name a school on every row, but every entrant is that state's. Open events (TOC,
 * Tarheel Classic, duals, Journeymen) are deliberately absent: a club singlet there says nothing
 * about the state.
 */
export function championshipState(eventKey: string): string | null {
  const k = eventKey.toLowerCase()
  if (/^(nchsaa-states|nc-usaw-states)/.test(k)) return "NC"
  if (/^(vhsl|visaa)-states/.test(k)) return "VA"
  if (/^(schsl|scisa)-states|^sc-usaw-states/.test(k)) return "SC"
  if (/^(mpssaa|miaa|mis)-states/.test(k)) return "MD"
  return null
}

export type StateIdentityIndex = Map<string, string>

/** (name, state) with gender stated if known; unknown gender links only when one person answers. */
function stateLookup(index: StateIdentityIndex, norm: string, state: string, gender: "M" | "F" | null): string | undefined {
  if (gender) return index.get(`${norm}|${state}|${gender === "F" ? "Female" : "Male"}`)
  const m = index.get(`${norm}|${state}|Male`)
  const f = index.get(`${norm}|${state}|Female`)
  return m && f ? undefined : m ?? f
}

function side(
  name: string,
  club: unknown,
  aliases: AliasIndex,
  opts: BuildOptions,
  eventState: string | null,
  gender: "M" | "F" | null,
  stateIndex?: StateIdentityIndex,
): Side | null {
  const raw = String(name ?? "").trim()
  if (!raw) return null
  const { team, state: clubState } = aliasTeam(club)
  const state = clubState ?? eventState
  const norm = normName(raw)
  const id = aliases.get(`${raw}|${team}`) ?? (eventState && stateIndex ? stateLookup(stateIndex, norm, eventState, gender) : undefined)
  if (id) return { key: id, identified: true, name: raw, state }
  if (!opts.includeUnidentified) return { key: "", identified: false, name: raw, state }
  return { key: `u:${norm}|${(state ?? team).toLowerCase()}`, identified: false, name: raw, state }
}

/**
 * One row per real bout. Mirrored rows (same event, weight, round and pair of names) collapse
 * to one; a pair whose two rows disagree on the winner is dropped as unreadable.
 */
export function boutsFromOtherTournament(
  rows: OtherTournamentRow[],
  aliases: AliasIndex,
  opts: BuildOptions,
  /** Resolves state-championship sides, whose rows name a school, on (name, state, gender). */
  stateIndex?: StateIdentityIndex,
): { bouts: Bout[]; dropped: Record<string, number> } {
  const dropped = { notContested: 0, conflicting: 0, noName: 0, sameWrestler: 0, mirrored: 0 }
  const eventDate = new Map<string, string>()
  for (const r of rows) {
    if (r.event_date && !eventDate.has(r.event_key)) eventDate.set(r.event_key, r.event_date)
  }
  const groups = new Map<string, OtherTournamentRow[]>()
  for (const r of rows) {
    if (!isContested(r.win_type, !!r.is_bye)) { dropped.notContested++; continue }
    const a = normName(r.athlete_name)
    const b = normName(r.opponent_name)
    if (!a || !b || a === "bye" || b === "bye") { dropped.noName++; continue }
    const pair = [a, b].sort().join("~")
    const k = `${r.event_key}|${r.weight_class ?? ""}|${r.round ?? ""}|${pair}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }
  const bouts: Bout[] = []
  for (const g of groups.values()) {
    const winners = new Set(g.map((r) => normName(r.win ? r.athlete_name : r.opponent_name)))
    if (winners.size > 1) { dropped.conflicting++; continue }
    dropped.mirrored += g.length - 1
    const r = g.find((x) => x.win) ?? g[0]
    const wName = String(r.win ? r.athlete_name : r.opponent_name)
    const wClub = r.win ? r.athlete_club : r.opponent_club
    const lName = String(r.win ? r.opponent_name : r.athlete_name)
    const lClub = r.win ? r.opponent_club : r.athlete_club
    const gender = r.gender === "F" || r.gender === "M" ? r.gender : /women|girls/i.test(r.event_key) ? "F" : null
    const evState = championshipState(r.event_key)
    const w = side(wName, wClub, aliases, opts, evState, gender, stateIndex)
    const l = side(lName, lClub, aliases, opts, evState, gender, stateIndex)
    if (!w || !l) { dropped.noName++; continue }
    if (w.key && w.key === l.key) { dropped.sameWrestler++; continue }
    bouts.push({
      eventKey: r.event_key,
      eventFamily: eventFamily(r.event_key),
      date: eventDate.get(r.event_key) ?? defaultEventDate(r.event_key, r.year),
      weight: String(r.weight_class ?? "").trim(),
      round: r.round,
      winner: w,
      loser: l,
      method: r.win_type,
      gender,
    })
  }
  return { bouts, dropped }
}

export type StateTournamentRow = {
  season: number
  state: string
  gender: string | null
  classification: string | null
  weight: string | null
  bout: string | null
  winner_name: string | null
  winner_school: string | null
  loser_name: string | null
  loser_school: string | null
  result_type: string | null
}

export type IdentityRow = { id: string; normalized_name: string | null; state: string | null; gender: string | null }

/** (name, state, gender) -> identity, only where exactly one person answers. */
export function buildStateIdentityIndex(identities: IdentityRow[]): StateIdentityIndex {
  const counts = new Map<string, string[]>()
  for (const i of identities) {
    if (!i.normalized_name || !i.state) continue
    const k = `${i.normalized_name}|${i.state}|${i.gender ?? ""}`
    if (!counts.has(k)) counts.set(k, [])
    counts.get(k)!.push(i.id)
  }
  const out = new Map<string, string>()
  for (const [k, ids] of counts) if (ids.length === 1) out.set(k, ids[0])
  return out
}

/**
 * The 49-state placement bouts (state_tournament_bouts). States whose full brackets are already
 * in other_tournament_bouts (`skipStates`, keyed "STATE|season") are skipped so no bout counts twice.
 */
export function boutsFromStateTournament(
  rows: StateTournamentRow[],
  index: StateIdentityIndex,
  opts: BuildOptions & { skipStates: Set<string> },
): { bouts: Bout[]; dropped: Record<string, number> } {
  const dropped = { notContested: 0, coveredElsewhere: 0, noName: 0, sameWrestler: 0 }
  const bouts: Bout[] = []
  for (const r of rows) {
    if (opts.skipStates.has(`${r.state}|${r.season}`)) { dropped.coveredElsewhere++; continue }
    if (!isContested(r.result_type)) { dropped.notContested++; continue }
    const gender = /girl|female|women/i.test(String(r.gender)) ? "F" : "M"
    const g = gender === "F" ? "Female" : "Male"
    const mk = (name: unknown, school: unknown): Side | null => {
      const n = normName(name)
      if (!n) return null
      const id = index.get(`${n}|${r.state}|${g}`)
      if (id) return { key: id, identified: true, name: String(name), state: r.state }
      if (!opts.includeUnidentified) return { key: "", identified: false, name: String(name), state: r.state }
      return { key: `u:${n}|${r.state.toLowerCase()}`, identified: false, name: String(name), state: r.state }
    }
    const w = mk(r.winner_name, r.winner_school)
    const l = mk(r.loser_name, r.loser_school)
    if (!w || !l) { dropped.noName++; continue }
    if (w.key && w.key === l.key) { dropped.sameWrestler++; continue }
    const eventKey = `state:${r.state}-${r.season}`
    bouts.push({
      eventKey,
      eventFamily: eventFamily(eventKey),
      date: defaultEventDate(eventKey, r.season),
      weight: String(r.weight ?? "").trim(),
      round: r.bout,
      winner: w,
      loser: l,
      method: r.result_type,
      gender,
    })
  }
  return { bouts, dropped }
}
