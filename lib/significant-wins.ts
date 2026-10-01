import { hasNameAlias, nameWords, namesLikelySamePerson } from "@/lib/athlete-name-match"

/**
 * Wins worth showing on a profile: the ones over somebody the reader has heard of.
 *
 * A match list is long and mostly undifferentiated — a state champion's 55 wins look the same as
 * anybody else's until you know who they were against. This picks out the two kinds that carry
 * weight in North Carolina: a win over a wrestler in the Tournament of Champions field, and a win
 * over a ranked prospect.
 *
 * The season window is the caller's to apply — pass only the bouts you want considered. Every
 * caller passes the most recent season, matching what seeding uses for head-to-head: a
 * significant win is an argument about who somebody is beating now.
 *
 * Unpublished classes count. The 2029 rankings are not public yet, but a win over the boy we
 * privately have at #3 in that class is no less real, and hiding it would make the section less
 * true rather than more careful. Only the fact of the ranking is used here, never the number, so
 * nothing unpublished is disclosed by showing it.
 */

export type Bout = {
  opponent?: string | null
  opponent_name?: string | null
  opponent_school?: string | null
  win_loss?: string | null
  result?: string | null
  date?: string | null
  venue?: string | null
  weight?: number | string | null
}

export type RankedOpponent = {
  name: string
  /** Kept for ordering and for the admin view; never rendered on a public profile. */
  ranking: number | null
  graduationYear: number | null
}

export type OpponentIndex = {
  /** Names of wrestlers in the announced TOC field. */
  tocField: readonly string[]
  /** Every athlete carrying a prospect ranking, published or not. */
  ranked: readonly RankedOpponent[]
  /**
   * Wrestlers ranked nationally by FloWrestling / Sports Illustrated / MatScouts, including
   * out-of-state ones. A win over a nationally ranked opponent is the strongest credential a
   * result can carry, and most of them will never be in our own athlete table.
   */
  nationallyRanked?: readonly NationallyRankedOpponent[]
  /**
   * North Carolina state champions and placers (lib/state-placers.ts). Optional, and loaded only
   * by the profile and the scouting report: the ranking engine shares this index and scores wins
   * by `reason`, so adding state results there would silently change the rankings.
   *
   * The profile also asks for other states' placers (`state` set, e.g. "VA"); see
   * `outOfStatePlacerFits` for the stricter bar they have to clear.
   */
  statePlacers?: readonly StatePlacer[]
  /**
   * Every North Carolina high school seen in the state results. A bout's opponent school only
   * rules out a placer when it is one of these: tournament brackets often list a club instead
   * ("Catawba Rasslin" for Tommy Kishpaugh of St. Stephens), and a club says nothing about which
   * namesake it is.
   */
  stateSchools?: readonly string[]
  /**
   * Fargo All-Americans (lib/state-placers.ts). Loaded with the state placers and, like them,
   * only by the profile and the scouting report: the label rides on a win that already earned its
   * place, so a coach reads "Fargo All-American" beside the name rather than just "NC ranked".
   */
  fargoAllAmericans?: readonly FargoAllAmerican[]
  /**
   * Placers at national events - Super 32, NHSCA Nationals, Journeymen - worked out from full
   * brackets (scripts/import-national-event-placers.py). Profile and bout tables only, with the
   * out-of-state evidence rules.
   */
  eventPlacers?: readonly EventPlacer[]
}

export type EventPlacement = { event: string; year: number; place: number; weight: number | null }

export type EventPlacer = {
  name: string
  /** The state code the bracket listed, or null where it listed a club (Journeymen). */
  state: string | null
  /** The club or school the bracket listed, when it was not a state. */
  schools: readonly string[]
  /** Borrowed from his state placing: confirmed, distinctive, or shared with a North Carolinian. */
  identityConfirmed?: boolean
  distinctive?: boolean
  finishes: readonly EventPlacement[]
}

/**
 * "2025 Super 32 3rd (190)", "2026 NHSCA All-American (3rd, 138)", "2026 NHSCA Champion (138)";
 * the newest two when he has more.
 */
export function eventPlacementLabel(finishes: readonly EventPlacement[]): string | null {
  if (!finishes.length) return null
  // The same finish can reach here twice, once from each bracket entry of one wrestler.
  const unique = [...new Map(finishes.map((f) => [`${f.event}|${f.year}|${f.place}|${f.weight}`, f])).values()]
  const nhscaAA = unique.filter((f) => /nhsca/i.test(f.event))
  if (nhscaAA.length > 1) {
    const rest = unique.filter((f) => !/nhsca/i.test(f.event))
    const years = nhscaAA.map((f) => f.year).sort().join(", ")
    const head = `${nhscaAA.length}x NHSCA All-American (${years})`
    const tail = eventPlacementLabel(rest)
    return tail ? `${head} · ${tail}` : head
  }
  return [...unique]
    .sort((a, b) => b.year - a.year || a.place - b.place)
    .slice(0, 2)
    .map((f) => {
      const at = f.weight ? ` (${f.weight})` : ""
      if (f.place === 1) return `${f.year} ${f.event} Champion${at}`
      const ord = `${f.place}${ordinalSuffix(f.place)}`
      return /nhsca/i.test(f.event)
        ? `${f.year} NHSCA All-American (${ord}${f.weight ? `, ${f.weight}` : ""})`
        : `${f.year} ${f.event} ${ord}${at}`
    })
    .join(" · ")
}

export type FargoAllAmerican = {
  name: string
  schools: readonly string[]
  finishes: readonly { year: number; division: string; placement: number | null }[]
}

/** "2026 Fargo 16U Freestyle All-American (4th)", or "2x Fargo All-American (2026 16U Freestyle)". */
export function fargoLabel(finishes: FargoAllAmerican["finishes"]): string | null {
  if (!finishes.length) return null
  const newest = [...finishes].sort((a, b) => b.year - a.year || (a.placement ?? 99) - (b.placement ?? 99))[0]
  const division = newest.division.replace(/\bBoys\s+/i, "").trim()
  if (finishes.length > 1) return `${finishes.length}x Fargo All-American (${newest.year} ${division})`
  const place = newest.placement ? ` (${newest.placement}${ordinalSuffix(newest.placement)})` : ""
  return `${newest.year} Fargo ${division} All-American${place}`
}

/** Every accolade on a bout's opponent, for display: "2026 5A State Runner-up · 2026 Fargo ...". */
export function accoladeLine(win: Pick<SignificantWin, "stateLabel" | "fargoLabel" | "eventLabel">): string | null {
  return [win.stateLabel, win.eventLabel, win.fargoLabel].filter(Boolean).join(" · ") || null
}

/** The same with a national ranking in front: "#9 Sports Illustrated · 2026 AZ D3 State Champion". */
export function accoladeLineWithRank(
  win: Pick<SignificantWin, "stateLabel" | "fargoLabel" | "eventLabel" | "nationalRankLabel">,
): string | null {
  return [win.nationalRankLabel, accoladeLine(win)].filter(Boolean).join(" · ") || null
}

export type StatePlacer = {
  name: string
  /** Every school this name placed for; a bout at a different school is a namesake. */
  schools: readonly string[]
  /** Every top-8 finish on file for this name. */
  finishes: readonly StateFinish[]
  /** Two-letter state for another state's placer; absent for North Carolina. */
  state?: string | null
  /**
   * Another state's placer whom some bout on file has already tied to that state - by school or
   * by a "VA" listing (scripts/import-state-tournament-results.py sets it). Lets a club-only
   * bracket line count for a name we know is the Virginia wrestler.
   */
  identityConfirmed?: boolean
  /**
   * Another state's placer whose name no other placer and no North Carolina profile or placer could
   * share (lib/state-placers.ts). Credited on the name alone when the bout's weight fits his - see
   * `outOfStatePlacerFits`. Ryder Wilder, Georgia's 6A champion, wrestled AAU for Spec Ops, an
   * all-star side mostly from Florida: no bout line could ever name his state.
   */
  distinctive?: boolean
  /** A North Carolinian shares this name (nc_namesake, set by the confirmation pass). */
  ncNamesake?: boolean
}

export type StateFinish = {
  year: number
  place: number
  classification: string | null
  state?: string | null
  /** The weight he placed at, when the source gives one. */
  weight?: number | null
}

function ordinalSuffix(n: number): string {
  return n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"
}

/** "2026 7A State Champion", "2x State Champion (2026 7A)", "2025 4A State 4th". */
export function statePlacerLabel(finishes: readonly StateFinish[]): string | null {
  if (!finishes.length) return null
  const best = [...finishes].sort((a, b) => a.place - b.place || b.year - a.year)[0]
  const titles = finishes.filter((f) => f.place === 1).length
  // "2026 VA 2A State Champion": an unmarked title is read as North Carolina's.
  const where = best.state && best.state !== "NC" ? ` ${best.state}` : ""
  const cls = `${where}${best.classification ? ` ${best.classification}` : ""}`
  if (best.place === 1) return titles > 1 ? `${titles}x State Champion (${best.year}${cls})` : `${best.year}${cls} State Champion`
  if (best.place === 2) return `${best.year}${cls} State Runner-up`
  return `${best.year}${cls} State ${best.place}${ordinalSuffix(best.place)}`
}

/**
 * The high-school season a bout belongs to, as the year of that season's state tournament:
 * a December 2025 bout is in the 2026 season. Null when the date will not parse.
 */
function boutSeason(date: string | null | undefined): number | null {
  const text = String(date ?? "").trim()
  if (!text) return null
  let y: number, m: number
  const iso = text.match(/^(\d{4})-(\d{1,2})-/)
  const us = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (iso) [y, m] = [Number(iso[1]), Number(iso[2])]
  else if (us) [m, y] = [Number(us[1]), Number(us[3].length === 2 ? `20${us[3]}` : us[3])]
  else return null
  return m >= 8 ? y + 1 : y
}

/**
 * A wrestler's high-school career is four seasons, so a finish more than three seasons from the
 * bout is somebody else with the same name - the 2020 3A runner-up "Joshua Wilson" is not the
 * Richlands wrestler JT Hill beat in 2026. Undated bouts keep every finish.
 */
function finishesInReach(finishes: readonly StateFinish[], date: string | null | undefined): StateFinish[] {
  const season = boutSeason(date)
  return season == null ? [...finishes] : finishes.filter((f) => Math.abs(f.year - season) <= 3)
}

export type NationallyRankedOpponent = {
  name: string
  rank: number
  /** "FloWrestling", "Sports Illustrated", "MatScouts". */
  source: string
  state: string | null
  /**
   * The ranked wrestler's school. When present, a bout is credited only with evidence it was him
   * (`nationalRankFits`), the bar out-of-state placers clear; when absent (the scouting report's
   * loader), the older name-only match stands.
   */
  school?: string | null
}

export type SignificantWin = {
  opponent: string
  opponentSchool: string | null
  event: string | null
  date: string | null
  result: string | null
  weight: number | null
  /**
   * Why it earned its place, strongest first: a national ranking outranks the TOC field,
   * which outranks a state prospect ranking.
   */
  reason: "national-ranked" | "toc-field" | "ranked" | "state-champion" | "national-placer" | "state-placer"
  /**
   * The opponent's best North Carolina state finish, whenever they have one - shown beside the
   * stronger reasons too, because "TOC field" and "state champion" are different facts.
   */
  stateLabel?: string
  /** The opponent's Fargo All-American finish, when they have one. */
  fargoLabel?: string
  /** His Super 32 / NHSCA / Journeymen placings: "2025 Super 32 3rd (190)". */
  eventLabel?: string
  opponentGraduationYear: number | null
  /** Set when the opponent is nationally ranked: "#12 Sports Illustrated". */
  nationalRankLabel?: string
  /**
   * The opponent's state, where a national ranking records one ("PA"). Everyone else a win can be
   * recognised by - NC prospects, NCHSAA and NCISA placers, the TOC field - is North Carolina's.
   */
  opponentState?: string | null
  /**
   * The opponent's North Carolina prospect ranking, where they carry one.
   *
   * Data, not display. Classes are ranked privately before they are published, so this must
   * never reach a public profile — the public route names the fields it returns and this is not
   * among them. The admin ranking board is the surface that shows it, because a reviewer
   * comparing two résumés needs to know whether a win came against #2 or #38.
   */
  opponentRanking: number | null
}

function opponentName(bout: Bout): string {
  return String(bout.opponent ?? bout.opponent_name ?? "").trim()
}

/** A win, however the row spells it. */
export function isWin(bout: Bout): boolean {
  const outcome = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return outcome === "W" || outcome.startsWith("W ") || outcome.includes("WIN")
}

/** A loss, however the row spells it. */
export function isLoss(bout: Bout): boolean {
  const outcome = String(bout.win_loss ?? bout.result ?? "").trim().toUpperCase()
  return outcome === "L" || outcome.startsWith("L ") || outcome.includes("LOSS")
}

function toWeight(value: Bout["weight"]): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * The significant wins in a bout list, newest first.
 *
 * Bouts store an opponent's name rather than an id, so this matches on the name — which is why it
 * uses the shared matcher rather than comparing strings. Getting this wrong credits a wrestler
 * with a win over somebody they never met.
 */
export function findSignificantWins(
  bouts: readonly Bout[],
  index: OpponentIndex,
  options?: { stateOnly?: boolean },
): SignificantWin[] {
  return findSignificantBouts(bouts, index, "win", options)
}

/**
 * The significant losses in a bout list, newest first.
 *
 * A scouting report is not a highlight reel. A college coach reading one wants to know who
 * beat this wrestler as much as who they beat — a narrow loss to the state champion says
 * something a win column cannot. Same bar as the wins: it only counts against somebody the
 * reader has heard of, so this stays a short list of meaningful results rather than a dump
 * of every dropped match.
 */
export function findSignificantLosses(
  bouts: readonly Bout[],
  index: OpponentIndex,
  options?: { stateOnly?: boolean },
): SignificantWin[] {
  return findSignificantBouts(bouts, index, "loss", options)
}

/** Lowercase words of a school name, without the words every school name shares. */
function schoolWords(value: string | null | undefined): string[] {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["high", "school", "hs", "senior", "the", "of", "academy", "christian"].includes(w))
}

/**
 * Whether a bout's opponent school is consistent with a placer's schools. Unknown on either side
 * counts as consistent - most bouts carry a school, and the check is there to stop a namesake, not
 * to demand data we do not have. Transfers are covered because every school the name placed for
 * is kept.
 */
function sameSchool(a: string[], b: string[]): boolean {
  return a.length > 0 && b.length > 0 && (a.every((w) => b.includes(w)) || b.every((w) => a.includes(w)))
}

function schoolConsistent(
  boutSchool: string | null | undefined,
  placerSchools: readonly string[],
  knownSchools: readonly string[] | undefined,
): boolean {
  const bout = schoolWords(boutSchool)
  if (!bout.length || !placerSchools.length) return true
  if (placerSchools.some((school) => sameSchool(schoolWords(school), bout))) return true
  // A different school rules the placer out only when it is a known NC high school; a club or an
  // out-of-state school is no evidence either way.
  const isKnownSchool = (knownSchools ?? []).some((school) => sameSchool(schoolWords(school), bout))
  return !isKnownSchool
}

/**
 * Whether a bout can be credited to another state's placer. Stricter than `schoolConsistent`:
 * there, a club says nothing and so passes, which is safe for North Carolina's placers because
 * our bouts are mostly against North Carolinians. Another state's placer needs positive evidence -
 * his school on the bout, the bout listing his state ("VA", "Tallwood (VA)"), or a name already
 * confirmed elsewhere and a bout that does not put him at a North Carolina school. Otherwise every
 * NC "Gavin Walker" or "John Smith" would collect a Virginia title.
 */
function outOfStatePlacerFits(
  boutSchool: string | null | undefined,
  placer: StatePlacer,
  knownSchools: readonly string[] | undefined,
  boutWeight?: number | string | null,
): boolean {
  const state = String(placer.state ?? "").toUpperCase()
  const text = String(boutSchool ?? "").trim().toUpperCase()
  if (state && (text === state || text.includes(`(${state})`))) return true
  const bout = schoolWords(boutSchool)
  if (placer.schools.some((school) => sameSchool(schoolWords(school), bout))) return true
  const atNcSchool = (knownSchools ?? []).some((school) => sameSchool(schoolWords(school), bout))
  if (atNcSchool) return false
  if (placer.identityConfirmed) return true
  // A name nobody else on file could carry, at a weight he could have wrestled.
  return Boolean(placer.distinctive) && weightFits(boutWeight, placer.finishes)
}

/**
 * Whether a bout's weight could be this placer's: from one class below the weight he placed at to
 * two above, as a share of it (0.9x-1.2x), since kids grow between a February final and a summer
 * dual. Unknown on either side is no evidence. The check that sorts namesakes from the real thing:
 * "Wyatt Nichols" at 113 is not West Virginia's 175-pound placer.
 */
function weightFits(boutWeight: number | string | null | undefined, finishes: readonly StateFinish[]): boolean {
  const bout = Number.parseInt(String(boutWeight ?? ""), 10)
  if (!Number.isFinite(bout) || bout <= 0) return false
  return finishes.some((f) => f.weight != null && f.weight > 0 && bout >= 0.9 * f.weight && bout <= 1.2 * f.weight)
}

/**
 * Whether a bout can be credited to a nationally ranked wrestler. His state on the bout ("AZ",
 * "Storm Wrestling Center - HSB (GA)"), his school, or his name already confirmed as a placer in
 * that state - never the name alone, since the national lists name boys from every state and NC
 * has namesakes of most of them. A North Carolinian ranked nationally gets the in-state check.
 */
function nationalRankFits(boutSchool: string | null | undefined, ranked: NationallyRankedOpponent, index: OpponentIndex): boolean {
  const schools = ranked.school ? [ranked.school] : []
  const state = String(ranked.state ?? "").toUpperCase()
  if (!state || state === "NC") return schoolConsistent(boutSchool, schools, index.stateSchools)
  const confirmed = statePlacersNamed(index, ranked.name).some((p) => p.state === state && p.identityConfirmed)
  return outOfStatePlacerFits(boutSchool, { name: ranked.name, schools, finishes: [], state, identityConfirmed: confirmed }, index.stateSchools)
}

/** Placers sharing this opponent's name, resolved once per name per index like the rest. */
const placersByIndex = new WeakMap<OpponentIndex, Map<string, StatePlacer[]>>()

/**
 * Placers by the words of their names. With every state's placers loaded there are over eleven
 * thousand, and running the fuzzy comparison against each for every opponent took a profile six
 * seconds. Only placers sharing a word with the opponent can match (see `nameWords`), so the
 * comparison runs on those alone; a name in an alias group still gets the full list.
 */
const placerWordsByIndex = new WeakMap<OpponentIndex, Map<string, StatePlacer[]>>()
function placerCandidates(index: OpponentIndex, name: string): readonly StatePlacer[] {
  const all = index.statePlacers ?? []
  if (hasNameAlias(name)) return all
  let byWord = placerWordsByIndex.get(index)
  if (!byWord) {
    byWord = new Map()
    for (const placer of all) {
      for (const word of new Set(nameWords(placer.name))) {
        const list = byWord.get(word)
        if (list) list.push(placer)
        else byWord.set(word, [placer])
      }
    }
    placerWordsByIndex.set(index, byWord)
  }
  const out = new Set<StatePlacer>()
  for (const word of nameWords(name)) for (const placer of byWord.get(word) ?? []) out.add(placer)
  // Keep the index's order, so results come out exactly as the full scan returned them.
  return out.size ? all.filter((p) => out.has(p)) : []
}

/** Event placers sharing an opponent's name, narrowed by name word like `placerCandidates`. */
const eventWordsByIndex = new WeakMap<OpponentIndex, Map<string, EventPlacer[]>>()
function eventPlacersNamed(index: OpponentIndex, name: string): EventPlacer[] {
  const all = index.eventPlacers ?? []
  if (!all.length) return []
  let byWord = eventWordsByIndex.get(index)
  if (!byWord) {
    byWord = new Map()
    for (const placer of all) {
      for (const word of new Set(nameWords(placer.name))) {
        const list = byWord.get(word)
        if (list) list.push(placer)
        else byWord.set(word, [placer])
      }
    }
    eventWordsByIndex.set(index, byWord)
  }
  const pool = hasNameAlias(name) ? all : [...new Set(nameWords(name).flatMap((w) => byWord!.get(w) ?? []))]
  return pool.filter((p) => namesLikelySamePerson(p.name, name))
}

/** An event placer judged by the out-of-state rules, with his bracket's state or club as evidence. */
function eventPlacerFits(bout: Bout, placer: EventPlacer, index: OpponentIndex): boolean {
  return outOfStatePlacerFits(
    bout.opponent_school,
    {
      name: placer.name,
      schools: placer.schools,
      state: placer.state ?? "",
      identityConfirmed: placer.identityConfirmed,
      distinctive: placer.distinctive,
      finishes: placer.finishes.map((f) => ({ year: f.year, place: f.place, classification: null, weight: f.weight })),
    },
    index.stateSchools,
    bout.weight,
  )
}

function statePlacersNamed(index: OpponentIndex, name: string): StatePlacer[] {
  if (!index.statePlacers?.length) return []
  let cache = placersByIndex.get(index)
  if (!cache) {
    cache = new Map()
    placersByIndex.set(index, cache)
  }
  const key = name.trim().toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit
  const found = placerCandidates(index, name).filter((p) => namesLikelySamePerson(p.name, name))
  cache.set(key, found)
  return found
}

type OpponentResolution = {
  national: NationallyRankedOpponent | null
  inField: boolean
  ranked: RankedOpponent | null
}

/**
 * Who an opponent is, resolved once per name per index.
 *
 * `namesLikelySamePerson` is a fuzzy comparison, and this used to run it for every bout against
 * every entry in the index — with 765 opponents on file and eight thousand bouts in a class, the
 * ranking board spent sixty-four seconds of CPU here and the admin watched a spinner. Opponent
 * names repeat heavily both within a wrestler's season and across a class, so the answer is
 * cached against the index it was computed from.
 *
 * Keyed on the index object, so a caller that rebuilds the index gets fresh answers, and the
 * cache is collected with it. Behaviour is identical to resolving inline — this only stops the
 * same question being asked thousands of times.
 */
const resolutionsByIndex = new WeakMap<OpponentIndex, Map<string, OpponentResolution>>()

function resolveOpponent(index: OpponentIndex, name: string): OpponentResolution {
  let cache = resolutionsByIndex.get(index)
  if (!cache) {
    cache = new Map()
    resolutionsByIndex.set(index, cache)
  }
  const key = name.trim().toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit

  // A national ranking is checked first: it is the strongest thing a result can be
  // measured against, and it is the only credential most out-of-state opponents will have.
  const national = (index.nationallyRanked ?? []).find((r) => namesLikelySamePerson(r.name, name)) ?? null
  const inField = national ? false : index.tocField.some((fieldName) => namesLikelySamePerson(fieldName, name))
  /*
   * Resolved even when the opponent is in the TOC field, which it previously was not.
   *
   * Being invited to the Tournament of Champions and being the #1 wrestler in a class are not
   * alternatives, and treating them as such threw away the better fact. Tyton Kostoff's win over
   * Jake Amiott, the #2 in the Class of 2028, and Lukas Allman's over Aaron Ellison, the #1,
   * both arrived carrying `opponentRanking: null` — so they were scored and labelled as though
   * the opponent were any other invitee, including the ones who went 0-2.
   *
   * `reason` keeps its old precedence, so nothing that reads it changes. What changes is that a
   * ranking is now available alongside it for whoever wants the sharper number.
   */
  const ranked = national ? null : index.ranked.find((r) => namesLikelySamePerson(r.name, name)) ?? null

  const resolution: OpponentResolution = { national, inField, ranked }
  cache.set(key, resolution)
  return resolution
}

function findSignificantBouts(
  bouts: readonly Bout[],
  index: OpponentIndex,
  outcome: "win" | "loss",
  options?: { stateOnly?: boolean },
): SignificantWin[] {
  const wins: SignificantWin[] = []
  const seen = new Set<string>()
  const matchesOutcome = outcome === "win" ? isWin : isLoss

  for (const bout of bouts) {
    if (!matchesOutcome(bout)) continue
    const name = opponentName(bout)
    if (!name) continue

    const resolved = options?.stateOnly ? { national: null, inField: false, ranked: null } : resolveOpponent(index, name)
    const { inField, ranked } = resolved
    const national =
      resolved.national && resolved.national.school !== undefined && !nationalRankFits(bout.opponent_school, resolved.national, index)
        ? null
        : resolved.national
    // Finishes of same-named placers whose school fits this bout and who could have been this
    // opponent at the time.
    const fitting = statePlacersNamed(index, name).filter((p) =>
      p.state
        ? outOfStatePlacerFits(bout.opponent_school, p, index.stateSchools, bout.weight)
        : schoolConsistent(bout.opponent_school, p.schools, index.stateSchools),
    )
    const finishes = fitting.flatMap((p) => finishesInReach(p.finishes, bout.date))
    const stateLabel = statePlacerLabel(finishes)
    const bestPlace = finishes.length ? Math.min(...finishes.map((f) => f.place)) : null
    const placer = stateLabel && bestPlace != null ? { label: stateLabel, bestPlace } : null
    const season = boutSeason(bout.date)
    const fargo = fargoLabel(
      (index.fargoAllAmericans ?? [])
        .filter((f) => namesLikelySamePerson(f.name, name))
        .filter((f) => schoolConsistent(bout.opponent_school, f.schools, index.stateSchools))
        .flatMap((f) => f.finishes)
        .filter((f) => season == null || Math.abs(f.year - season) <= 3),
    )
    const eventPlacers = eventPlacersNamed(index, name).filter((p) => eventPlacerFits(bout, p, index))
    const eventLabel = eventPlacementLabel(
      eventPlacers.flatMap((p) => p.finishes).filter((f) => season == null || Math.abs(f.year - season) <= 3),
    )
    const eventState = eventLabel ? eventPlacers.find((p) => p.state && p.state !== "NC")?.state ?? null : null
    if (!national && !inField && !ranked && !placer && !eventLabel) continue

    // One entry per opponent per day: the same bout is sometimes stored twice.
    const key = `${name.toLowerCase()}|${bout.date ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)

    wins.push({
      opponent: name,
      opponentSchool: bout.opponent_school ?? null,
      event: bout.venue ?? null,
      date: bout.date ?? null,
      result: bout.result ?? null,
      weight: toWeight(bout.weight),
      reason: national
        ? "national-ranked"
        : inField
          ? "toc-field"
          : ranked
            ? "ranked"
            : placer?.bestPlace === 1
              ? "state-champion"
              : !placer
                ? "national-placer"
                : "state-placer",
      ...(placer ? { stateLabel: placer.label } : {}),
      ...(eventLabel ? { eventLabel } : {}),
      ...(fargo ? { fargoLabel: fargo } : {}),
      opponentGraduationYear: ranked?.graduationYear ?? null,
      opponentRanking: ranked?.ranking ?? null,
      ...(national
        ? { nationalRankLabel: `#${national.rank} ${national.source}`, opponentState: national.state }
        : placer && finishes.some((f) => f.state && f.state !== "NC")
          ? { opponentState: finishes.find((f) => f.state && f.state !== "NC")!.state }
          : eventState
            ? { opponentState: eventState }
            : {}),
    })
  }

  /*
   * An accolade belongs to the person, not the bout. Brackets spell schools differently from one
   * event to the next, so the same opponent could carry "2026 5A State Champion" at one meeting
   * and nothing at the next - Luke Padgett did, twice on one report. Lend the label across.
   */
  const labelsByName = new Map<string, { stateLabel?: string; fargoLabel?: string; eventLabel?: string }>()
  for (const w of wins) {
    const key = w.opponent.toLowerCase()
    const seenLabels = labelsByName.get(key) ?? {}
    labelsByName.set(key, {
      stateLabel: seenLabels.stateLabel ?? w.stateLabel,
      fargoLabel: seenLabels.fargoLabel ?? w.fargoLabel,
      eventLabel: seenLabels.eventLabel ?? w.eventLabel,
    })
  }
  for (const w of wins) {
    const labels = labelsByName.get(w.opponent.toLowerCase())
    if (!w.stateLabel && labels?.stateLabel) w.stateLabel = labels.stateLabel
    if (!w.fargoLabel && labels?.fargoLabel) w.fargoLabel = labels.fargoLabel
    if (!w.eventLabel && labels?.eventLabel) w.eventLabel = labels.eventLabel
  }

  const reasonRank = {
    "national-ranked": 0,
    "toc-field": 1,
    ranked: 2,
    "state-champion": 3,
    "national-placer": 4,
    "state-placer": 5,
  } as const
  return wins.sort((a, b) => {
    // Nationally ranked first, then TOC, then state-ranked; within a tier, newest first.
    // Undated rows sink rather than jump.
    if (a.reason !== b.reason) return reasonRank[a.reason] - reasonRank[b.reason]
    const at = a.date ? Date.parse(a.date) : Number.NaN
    const bt = b.date ? Date.parse(b.date) : Number.NaN
    if (Number.isNaN(at) && Number.isNaN(bt)) return 0
    if (Number.isNaN(at)) return 1
    if (Number.isNaN(bt)) return -1
    return bt - at
  })
}

/**
 * Only wins whose opponent carries an accolade a reader recognises: a national ranking, a North
 * Carolina ranking, or a state title or placing. A place in the Tournament of Champions field is
 * an invitation, not an accolade - a TOC-field win stays only when that opponent is also ranked or
 * a state placer, and it is then shown under that accolade instead. Everything else is dropped.
 *
 * Used by the profile and the scouting report. The ranking engine and the TOC recruiting guide do
 * their own weighing and keep TOC-field wins.
 */
export function withAccoladesOnly(wins: readonly SignificantWin[]): SignificantWin[] {
  const out: SignificantWin[] = []
  for (const win of wins) {
    if (win.reason !== "toc-field") {
      out.push(win)
      continue
    }
    if (win.opponentRanking != null) out.push({ ...win, reason: "ranked" })
    else if (win.stateLabel) out.push({ ...win, reason: /champion/i.test(win.stateLabel) ? "state-champion" : "state-placer" })
    else if (win.eventLabel) out.push({ ...win, reason: "national-placer" })
  }
  return out
}
