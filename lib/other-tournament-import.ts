/**
 * Parse a bracket export (Trackwrestling-style bout CSV) into athlete results + bouts
 * for the "Other Tournaments" section.
 *
 * Used for Super 32 Early Entry / qualifier events, which are a DIFFERENT tournament
 * from Super 32 itself — these rows never go near `super32_results`.
 *
 * Pure functions only, so the parsing and the athlete-name matching are unit tested
 * without a database.
 */

/** One row of the source CSV, after the `="..."` wrapper is stripped. */
export type SourceBoutRow = {
  date: string
  weight: string
  round: string
  winningWrestler: string
  winningTeam: string
  result: string
  winType: string
  losingWrestler: string
  losingTeam: string
  city: string
  state: string
  event: string
}

export type ParsedBout = {
  weightClass: string
  /** Canonical round name, so NC's "Finals" and VA's "1st Place Match" read the same. */
  round: string
  /** The label exactly as the bracket printed it. */
  sourceRound: string
  boutOrder: number
  athleteName: string
  athleteClub: string
  opponentName: string | null
  opponentClub: string | null
  win: boolean
  isBye: boolean
  winType: string
  score: string
}

export type ParsedAthleteResult = {
  athleteName: string
  club: string
  weightClass: string
  wins: number
  losses: number
  byes: number
  record: string
  /** 1-4 when the athlete wrestled in the finals or the 3rd-place match; null otherwise. */
  placement: number | null
  /** Top 4 — earns a chance to enter Super 32 when registration opens. */
  qualified: boolean
  /** Size of this athlete's own bracket (see `bracketGroups`). */
  entrants: number
  bouts: ParsedBout[]
}

export type ParsedTournament = {
  athletes: ParsedAthleteResult[]
  bouts: ParsedBout[]
  /** Field size per weight class, for context on a profile row. */
  entrantsByWeight: Record<string, number>
}

/**
 * Some legs run two brackets under one weight label — the VA leg had a separate youth and
 * high-school 106, each with its own final. The export carries no division column, so the
 * brackets are separated by who actually wrestled whom: within a weight, every wrestler
 * reachable through a chain of bouts is in the same bracket.
 *
 * This keeps "field of N" honest and stops two champions at one weight from looking like
 * a single 58-man bracket.
 */
function bracketGroups(athleteKeys: string[], edges: Array<[string, string]>): Map<string, number> {
  const parent = new Map<string, string>(athleteKeys.map((key) => [key, key]))
  const find = (key: string): string => {
    let root = key
    while (parent.get(root) !== root) root = parent.get(root)!
    let cursor = key
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor)!
      parent.set(cursor, root)
      cursor = next
    }
    return root
  }
  for (const [a, b] of edges) {
    if (!parent.has(a) || !parent.has(b)) continue
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) parent.set(rootA, rootB)
  }
  const size = new Map<string, number>()
  for (const key of athleteKeys) {
    const root = find(key)
    size.set(root, (size.get(root) ?? 0) + 1)
  }
  return new Map(athleteKeys.map((key) => [key, size.get(find(key))!]))
}

/**
 * Bracket vocabularies differ by event. The NC leg prints "Finals" and "Quarter-Finals";
 * the VA leg prints "1st Place Match" and "Quarterfinal" for the same bouts. Everything is
 * mapped to one canonical set so placement detection, ordering, and the profile display do
 * not have to care which state ran the bracket.
 */
const ROUND_ALIASES: Record<string, string> = {
  "1st place match": "Finals",
  "1st place": "Finals",
  championship: "Finals",
  "championship final": "Finals",
  final: "Finals",
  finals: "Finals",
  "3rd place match": "3rd Place",
  "3rd place": "3rd Place",
  "5th place match": "5th Place",
  "5th place": "5th Place",
  "7th place match": "7th Place",
  "7th place": "7th Place",
  semifinal: "Semi-Finals",
  semifinals: "Semi-Finals",
  "semi-final": "Semi-Finals",
  "semi-finals": "Semi-Finals",
  quarterfinal: "Quarter-Finals",
  quarterfinals: "Quarter-Finals",
  "quarter-final": "Quarter-Finals",
  "quarter-finals": "Quarter-Finals",
  "cons. semi": "Consi-Semis",
  "cons semi": "Consi-Semis",
  "cons. semis": "Consi-Semis",
  "consi-semis": "Consi-Semis",
  "consolation semifinal": "Consi-Semis",
}

/** Canonical round name for a source label — the label itself when nothing maps. */
export function canonicalRound(round: string): string {
  const raw = tidy(round)
  if (!raw) return ""
  const key = raw.toLowerCase().replace(/\s+/g, " ")
  const alias = ROUND_ALIASES[key]
  if (alias) return alias
  // "Champ. Round 2" / "Cons. Round 3" / a pool's bare "Round 1".
  const champ = key.match(/^champ\.?\s*round\s*(\d+)$/)
  if (champ) return `Champ. Round ${champ[1]}`
  const cons = key.match(/^cons\.?\s*round\s*(\d+)$/)
  if (cons) return `Cons. Round ${cons[1]}`
  const pool = key.match(/^round\s*(\d+)$/)
  if (pool) return `Round ${pool[1]}`
  return raw
}

/**
 * Bracket progression order, so a profile can list bouts in the order they were wrestled
 * and TOC seeding can weight a quarterfinal above a first-round consolation.
 */
const ROUND_ORDER: Record<string, number> = {
  "Round of 128": 10,
  "Round of 64": 20,
  "Round of 32": 30,
  "Consi of 64 #1": 35,
  "Consi of 64 #2": 36,
  "Round of 16": 40,
  "Consi of 32 #1": 45,
  "Consi of 32 #2": 46,
  "Quarter-Finals": 50,
  "Consi of 16 #1": 55,
  "Consi of 16 #2": 56,
  "Semi-Finals": 60,
  "Consi of 8 #1": 65,
  "Consi of 8 #2": 66,
  "Consi of 4": 70,
  "Consi-Semis": 75,
  "5th Place": 80,
  "7th Place": 81,
  "3rd Place": 85,
  Finals: 90,
}

export function roundOrder(round: string): number {
  const canonical = canonicalRound(round)
  const known = ROUND_ORDER[canonical]
  if (known != null) return known
  // Numbered preliminary rounds sit before the quarterfinals, championship side first.
  const champ = canonical.match(/^Champ\. Round (\d+)$/) ?? canonical.match(/^Round (\d+)$/)
  if (champ) return 10 + Number(champ[1]) * 2
  const cons = canonical.match(/^Cons\. Round (\d+)$/)
  if (cons) return 11 + Number(cons[1]) * 2
  return 0
}

/** The bout that decides 1st and 2nd, whatever the bracket calls it. */
export function isFinalsRound(round: string): boolean {
  return canonicalRound(round) === "Finals"
}

/** The bout that decides 3rd and 4th, whatever the bracket calls it. */
export function isThirdPlaceRound(round: string): boolean {
  return canonicalRound(round) === "3rd Place"
}

/**
 * Team-name fixes for a specific entry in a specific event.
 *
 * Bracket operators mistype club names, and the team is not cosmetic here: it is half the
 * key that separates two wrestlers with the same name, and it is used to pick between
 * same-named profiles. Corrections live in code rather than being hand-edited in the
 * database or in the source CSV, so re-importing the export keeps them.
 *
 * Scope each entry to one athlete unless the whole team label is confirmed wrong — the VA
 * bracket also listed three other wrestlers as "Roanoke Area Wrestling" and those have not
 * been confirmed either way.
 */
export type ClubCorrection = {
  eventKey: string
  athleteName: string
  from: string
  to: string
  note: string
}

export const CLUB_CORRECTIONS: ClubCorrection[] = [
  {
    eventKey: "super32-early-entry-va-2026",
    athleteName: "Gavin Hickey",
    from: "Roanoke Area Wrestling",
    to: "Raleigh Area Wrestling",
    note: "Bracket typo — he wrestles for RAW in Raleigh, confirmed by Matt.",
  },
]

/** Corrected team name for one entry, or the name unchanged. */
export function correctClub(eventKey: string, athleteName: string, club: string): string {
  const name = tidy(athleteName).toLowerCase()
  const team = tidy(club).toLowerCase()
  const fix = CLUB_CORRECTIONS.find(
    (row) =>
      row.eventKey === eventKey &&
      tidy(row.athleteName).toLowerCase() === name &&
      tidy(row.from).toLowerCase() === team,
  )
  return fix ? fix.to : tidy(club)
}

/**
 * Apply club corrections to the raw rows, before anything keys off the team name — that way
 * the athlete's own result row, both sides of every bout, and the profile match all agree.
 */
export function applyClubCorrections(rows: SourceBoutRow[], eventKey: string): SourceBoutRow[] {
  if (!CLUB_CORRECTIONS.some((row) => row.eventKey === eventKey)) return rows
  return rows.map((row) => ({
    ...row,
    winningTeam: correctClub(eventKey, row.winningWrestler, row.winningTeam),
    losingTeam: correctClub(eventKey, row.losingWrestler, row.losingTeam),
  }))
}

/** A bout the winner did not have to wrestle — never counts as a win. */
export function isByeRow(row: SourceBoutRow): boolean {
  return row.winType.trim().toUpperCase() === "BYE" || !row.losingWrestler.trim()
}

/** Collapse whitespace; the source pads some team names with a leading space. */
export function tidy(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

/**
 * Athletes are identified by name + team within one event. Two kids with the same name on
 * different teams stay separate; the same kid always carries one team through a bracket.
 */
function athleteKey(name: string, team: string): string {
  return `${tidy(name).toLowerCase()}|${tidy(team).toLowerCase()}`
}

/**
 * Build athlete results and bouts from the raw bout rows.
 *
 * Placement comes from the bracket: the Finals decide 1st/2nd and the 3rd-Place match
 * decides 3rd/4th. Events that do not wrestle 5th/6th leave everyone else unplaced —
 * they still get a record, which is the data point that matters for rankings.
 */
export function parseTournament(rows: SourceBoutRow[]): ParsedTournament {
  const byAthlete = new Map<string, ParsedAthleteResult>()
  const bouts: ParsedBout[] = []

  const ensure = (name: string, team: string, weight: string): ParsedAthleteResult => {
    const key = athleteKey(name, team)
    let athlete = byAthlete.get(key)
    if (!athlete) {
      athlete = {
        athleteName: tidy(name),
        club: tidy(team),
        weightClass: tidy(weight),
        wins: 0,
        losses: 0,
        byes: 0,
        record: "0-0",
        placement: null,
        qualified: false,
        entrants: 0,
        bouts: [],
      }
      byAthlete.set(key, athlete)
    }
    return athlete
  }

  for (const row of rows) {
    const weight = tidy(row.weight)
    const round = tidy(row.round)
    const winner = tidy(row.winningWrestler)
    if (!winner || !weight) continue

    const winnerTeam = tidy(row.winningTeam)
    const loser = tidy(row.losingWrestler)
    const loserTeam = tidy(row.losingTeam)
    const winType = tidy(row.winType).toUpperCase()
    const score = tidy(row.result)
    const order = roundOrder(round)
    const canonical = canonicalRound(round)

    const winnerAthlete = ensure(winner, winnerTeam, weight)

    if (isByeRow(row)) {
      winnerAthlete.byes += 1
      const bout: ParsedBout = {
        weightClass: weight,
        round: canonical,
        sourceRound: round,
        boutOrder: order,
        athleteName: winnerAthlete.athleteName,
        athleteClub: winnerAthlete.club,
        opponentName: null,
        opponentClub: null,
        win: true,
        isBye: true,
        winType: "BYE",
        score: "",
      }
      winnerAthlete.bouts.push(bout)
      bouts.push(bout)
      continue
    }

    const loserAthlete = ensure(loser, loserTeam, weight)
    winnerAthlete.wins += 1
    loserAthlete.losses += 1

    const winnerBout: ParsedBout = {
      weightClass: weight,
      round: canonical,
      sourceRound: round,
      boutOrder: order,
      athleteName: winnerAthlete.athleteName,
      athleteClub: winnerAthlete.club,
      opponentName: loserAthlete.athleteName,
      opponentClub: loserAthlete.club,
      win: true,
      isBye: false,
      winType,
      score,
    }
    const loserBout: ParsedBout = {
      ...winnerBout,
      athleteName: loserAthlete.athleteName,
      athleteClub: loserAthlete.club,
      opponentName: winnerAthlete.athleteName,
      opponentClub: winnerAthlete.club,
      win: false,
    }
    winnerAthlete.bouts.push(winnerBout)
    loserAthlete.bouts.push(loserBout)
    bouts.push(winnerBout, loserBout)
  }

  for (const row of rows) {
    const round = tidy(row.round)
    const weight = tidy(row.weight)
    const winnerKey = athleteKey(row.winningWrestler, row.winningTeam)
    const loserKey = athleteKey(row.losingWrestler, row.losingTeam)
    const setPlace = (key: string, place: number) => {
      const athlete = byAthlete.get(key)
      if (!athlete || athlete.weightClass !== weight) return
      athlete.placement = place
      athlete.qualified = place <= 4
    }
    if (isFinalsRound(round)) {
      setPlace(winnerKey, 1)
      if (tidy(row.losingWrestler)) setPlace(loserKey, 2)
    } else if (isThirdPlaceRound(round)) {
      setPlace(winnerKey, 3)
      if (tidy(row.losingWrestler)) setPlace(loserKey, 4)
    }
  }

  const entrantsByWeight: Record<string, number> = {}
  for (const athlete of byAthlete.values()) {
    athlete.record = `${athlete.wins}-${athlete.losses}`
    athlete.bouts.sort((a, b) => a.boutOrder - b.boutOrder)
    entrantsByWeight[athlete.weightClass] = (entrantsByWeight[athlete.weightClass] ?? 0) + 1
  }

  // Field size is the athlete's own bracket, not every entry sharing the weight label.
  const keysByWeight = new Map<string, string[]>()
  for (const [key, athlete] of byAthlete) {
    const bucket = keysByWeight.get(athlete.weightClass)
    if (bucket) bucket.push(key)
    else keysByWeight.set(athlete.weightClass, [key])
  }
  const edgesByWeight = new Map<string, Array<[string, string]>>()
  for (const row of rows) {
    if (isByeRow(row)) continue
    const weight = tidy(row.weight)
    const edge: [string, string] = [
      athleteKey(row.winningWrestler, row.winningTeam),
      athleteKey(row.losingWrestler, row.losingTeam),
    ]
    const bucket = edgesByWeight.get(weight)
    if (bucket) bucket.push(edge)
    else edgesByWeight.set(weight, [edge])
  }
  for (const [weight, keys] of keysByWeight) {
    const sizes = bracketGroups(keys, edgesByWeight.get(weight) ?? [])
    for (const key of keys) {
      byAthlete.get(key)!.entrants = sizes.get(key) ?? keys.length
    }
  }

  const athletes = [...byAthlete.values()].sort((a, b) => {
    // Some legs run range brackets ("62-71"); sort on the leading number, then the label.
    const weightOf = (value: string) => {
      const match = value.match(/\d+/)
      return match ? Number(match[0]) : Number.POSITIVE_INFINITY
    }
    const weightDiff = weightOf(a.weightClass) - weightOf(b.weightClass)
    if (weightDiff) return weightDiff
    return (a.placement ?? 99) - (b.placement ?? 99) || b.wins - a.wins || a.athleteName.localeCompare(b.athleteName)
  })

  return { athletes, bouts, entrantsByWeight }
}

/* ------------------------------------------------------------------ *
 * Matching entrants to our athlete profiles
 * ------------------------------------------------------------------ */

/** Minimal shape of an `athletes` row needed to match a name. */
export type MatchableAthlete = {
  id: string
  name: string | null
  wrestling_name?: string | null
  highschool?: string | null
  wrestlingClub?: string | null
  graduationyear?: number | null
}

const NAME_SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"])

/**
 * Common short forms seen in bracket exports. Matching is one-directional per entry, so
 * both directions are listed (a bracket may print either form).
 */
const NICKNAMES: Record<string, string> = {
  alex: "alexander",
  alexander: "alex",
  andy: "andrew",
  andrew: "andy",
  ben: "benjamin",
  benjamin: "ben",
  cam: "cameron",
  cameron: "cam",
  charlie: "charles",
  charles: "charlie",
  chris: "christopher",
  christopher: "chris",
  dan: "daniel",
  daniel: "dan",
  gabe: "gabriel",
  gabriel: "gabe",
  jake: "jacob",
  jacob: "jake",
  joe: "joseph",
  joseph: "joe",
  josh: "joshua",
  joshua: "josh",
  matt: "matthew",
  matthew: "matt",
  mike: "michael",
  michael: "mike",
  nate: "nathan",
  nathan: "nate",
  nick: "nicholas",
  nicholas: "nick",
  sam: "samuel",
  samuel: "sam",
  thomas: "tom",
  tom: "thomas",
  tony: "anthony",
  anthony: "tony",
  will: "william",
  william: "will",
  zach: "zachary",
  zack: "zachary",
  zachary: "zach",
}

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normalizeName(raw: string | null | undefined): string {
  if (!raw) return ""
  return String(raw)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.\-']/g, " ")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** First and last name with generational suffixes dropped, or null when unusable. */
export function nameParts(raw: string | null | undefined): { first: string; last: string } | null {
  const parts = normalizeName(raw)
    .split(" ")
    .filter((part) => part && !NAME_SUFFIXES.has(part))
  if (parts.length < 2) return null
  return { first: parts[0]!, last: parts[parts.length - 1]! }
}

export type MatchTier = "exact" | "nickname"

export type MatchOutcome =
  | { status: "matched"; athlete: MatchableAthlete; tier: MatchTier }
  | { status: "unmatched"; reason: "unparseable" | "no_candidate" }
  | { status: "ambiguous"; candidates: MatchableAthlete[] }

/** Prebuilt name index over our `athletes` rows. */
export type AthleteIndex = Map<string, MatchableAthlete[]>

export function buildAthleteIndex(athletes: MatchableAthlete[]): AthleteIndex {
  const index: AthleteIndex = new Map()
  for (const athlete of athletes) {
    const seen = new Set<string>()
    for (const candidate of [athlete.name, athlete.wrestling_name]) {
      const parts = nameParts(candidate)
      if (!parts) continue
      const key = `${parts.first} ${parts.last}`
      if (seen.has(key)) continue
      seen.add(key)
      const bucket = index.get(key)
      if (bucket) bucket.push(athlete)
      else index.set(key, [athlete])
    }
  }
  return index
}

function teamMatchesAthlete(team: string, athlete: MatchableAthlete): boolean {
  const source = normalizeName(team)
  if (!source) return false
  for (const field of [athlete.highschool, athlete.wrestlingClub]) {
    const value = normalizeName(field)
    if (!value) continue
    if (value === source || value.includes(source) || source.includes(value)) return true
  }
  return false
}

/** True when every candidate is the same person duplicated in `athletes`. */
function allSamePerson(candidates: MatchableAthlete[]): boolean {
  const first = candidates[0]!
  return candidates.every(
    (candidate) =>
      normalizeName(candidate.name) === normalizeName(first.name) &&
      normalizeName(candidate.highschool) === normalizeName(first.highschool),
  )
}

/** Richest row wins when duplicates are the same kid, so the profile we attach to is the filled-in one. */
function mostComplete(candidates: MatchableAthlete[]): MatchableAthlete {
  const score = (athlete: MatchableAthlete) =>
    (athlete.highschool ? 1 : 0) + (athlete.wrestlingClub ? 1 : 0) + (athlete.graduationyear ? 1 : 0)
  return [...candidates].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0]!
}

/**
 * Match one bracket entrant to a profile.
 *
 * Deliberately strict: only an exact first+last match or a known nickname counts. Matching
 * on last name plus a first initial produced wrong people in this data — "Catoe Byrd" is not
 * "Connor Byrd" — and a wrong match writes another kid's results onto a profile.
 */
export function matchAthlete(
  entrantName: string,
  entrantTeam: string,
  index: AthleteIndex,
): MatchOutcome {
  const parts = nameParts(entrantName)
  if (!parts) return { status: "unmatched", reason: "unparseable" }

  let candidates = index.get(`${parts.first} ${parts.last}`) ?? []
  let tier: MatchTier = "exact"

  if (candidates.length === 0) {
    const alias = NICKNAMES[parts.first]
    if (alias) {
      candidates = index.get(`${alias} ${parts.last}`) ?? []
      tier = "nickname"
    }
  }

  if (candidates.length === 0) return { status: "unmatched", reason: "no_candidate" }
  if (candidates.length === 1) return { status: "matched", athlete: candidates[0]!, tier }

  const byTeam = candidates.filter((candidate) => teamMatchesAthlete(entrantTeam, candidate))
  if (byTeam.length === 1) return { status: "matched", athlete: byTeam[0]!, tier }
  if (byTeam.length > 1 && allSamePerson(byTeam)) {
    return { status: "matched", athlete: mostComplete(byTeam), tier }
  }

  // A row with no school, club, or class year is a stub, not a rival claim on the name.
  // Prefer the filled-in profile rather than calling the pair ambiguous.
  const identified = candidates.filter(
    (candidate) => candidate.highschool || candidate.wrestlingClub || candidate.graduationyear,
  )
  if (identified.length === 1) return { status: "matched", athlete: identified[0]!, tier }
  if (identified.length > 1 && allSamePerson(identified)) {
    return { status: "matched", athlete: mostComplete(identified), tier }
  }

  if (allSamePerson(candidates)) {
    return { status: "matched", athlete: mostComplete(candidates), tier }
  }
  return { status: "ambiguous", candidates }
}
