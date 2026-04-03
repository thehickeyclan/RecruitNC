/**
 * Fetch NHSCA and Super32 from the actual database tables.
 * NHSCA profile merge order: **nhsca_roster** (live dashboard — wins/losses, real placement vs seed) → nhsca_placements → wrestling_nhsca_results.
 * No more copying data into athlete rows – read from where it lives.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { recruitNcDebugLogNhsca } from "@/lib/recruitnc-debug"

export interface TournamentResultRow {
  year: number
  placement: string
  record: string
  weight?: string
  division?: string
}

/** Escape single quote for ILIKE (e.g. D'Ettore => D''Ettore) so the query doesn't break. */
function escapeForIlike(s: string): string {
  return (s ?? "").replace(/'/g, "''")
}

/** Curly apostrophe (Unicode) — source data sometimes uses this. */
const CURLY_APO = "\u2019"

/** Return ILIKE patterns for a name so we match DB: straight/curly apostrophe and backtick (Data Dawg uses these). */
function getIlikePatternsForVariation(v: string): string[] {
  const straight = `%${escapeForIlike(v)}%`
  const patterns = [straight]
  if (v.includes("'")) {
    patterns.push(`%${v.replace(/'/g, CURLY_APO)}%`)
    patterns.push(`%${v.replace(/'/g, "`")}%`)
  }
  return patterns
}

/** Known same-person name spellings so tournament tables (incl. national team) match. */
const SAME_PERSON_ALIASES: string[][] = [
  ["Jackson D'Ettore", "Jackson Dettore", "Jackson D\u2019Ettore"],
  ["Samuel Gantt", "Sammy Gantt"],
]

/**
 * First-name equivalents (Matt/Matthew, Mike/Michael) so roster/import spelling can differ from profile `name`.
 * Same last name + school/weight still disambiguate in admin; here we only expand **first-token** variants for ILIKE search.
 */
const FIRST_NAME_EQUIVALENT_GROUPS: string[][] = [
  ["Matthew", "Matt"],
  ["Michael", "Mike", "Mick"],
  ["William", "Will", "Bill", "Billy"],
  ["Robert", "Bob", "Rob", "Bobby"],
  ["Richard", "Rick", "Dick"],
  ["James", "Jim", "Jimmy", "Jamie"],
  ["Joseph", "Joe", "Joey"],
  ["Anthony", "Tony"],
  ["Nicholas", "Nick", "Nicky"],
  ["Christopher", "Chris"],
  ["Benjamin", "Ben"],
  ["Samuel", "Sam"],
  ["Daniel", "Dan", "Danny"],
  ["Joshua", "Josh"],
  ["Thomas", "Tom", "Tommy"],
  ["Andrew", "Andy"],
  ["Patrick", "Pat"],
  ["Charles", "Chuck", "Charlie"],
  ["Edward", "Ed", "Eddie"],
  ["Kenneth", "Ken", "Kenny"],
  ["Donald", "Don"],
  ["Timothy", "Tim"],
  ["Stephen", "Steve"],
  ["Zachary", "Zach", "Zack"],
  ["Cameron", "Cam"],
  ["Nathan", "Nate"],
  ["Alexander", "Alex"],
  ["Jonathan", "Jon"],
  ["Gregory", "Greg"],
  ["Jeffrey", "Jeff"],
  ["Vincent", "Vince"],
  ["Bradford", "Brad"],
  ["Douglas", "Doug"],
  ["Lawrence", "Larry"],
  ["Raymond", "Ray"],
  ["Francis", "Frank"],
]

/** Add "Matt Hickey" when name is "Matthew Hickey" (and reverse), per FIRST_NAME_EQUIVALENT_GROUPS. */
function expandFirstNameEquivalents(fullName: string): string[] {
  const t = normalizeApostrophes((fullName ?? "").trim())
  if (!t) return []
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return []
  const firstRaw = parts[0]
  const firstLower = firstRaw.toLowerCase()
  const rest = parts.slice(1).join(" ")
  const out: string[] = []
  for (const group of FIRST_NAME_EQUIVALENT_GROUPS) {
    const lowerGroup = group.map((g) => g.toLowerCase())
    if (!lowerGroup.includes(firstLower)) continue
    for (const alt of group) {
      if (alt.toLowerCase() === firstLower) continue
      out.push(`${alt} ${rest}`)
    }
  }
  return out
}

/** Normalize for alias match: treat backtick as apostrophe, curly as straight, so all Jackson spellings match. */
function normalizeForAlias(s: string): string {
  return normalizeApostrophes((s ?? "").trim().toLowerCase().replace(/`/g, "'"))
}

/** Normalize Unicode/smart apostrophes to straight quote so matching works (e.g. "D'Ettore" from forms). */
function normalizeApostrophes(s: string): string {
  return (s ?? "")
    .replace(/\u2019/g, "'") // RIGHT SINGLE QUOTATION MARK
    .replace(/\u2018/g, "'") // LEFT SINGLE QUOTATION MARK
}

/** Return alternate spellings to try (e.g. Zach/Zack, D'Ettore/Dettore). Ensures we find tournament data even when DB spellings differ. Exported for use by wrestling-achievements API. */
export function getNameVariants(name: string): string[] {
  const t = normalizeApostrophes((name ?? "").trim())
  if (!t) return []
  const set = new Set<string>([t])
  const add = (s: string) => {
    if ((s ?? "").trim()) set.add(s.trim())
  }
  const withApostrophe = t.replace(/`/g, "'")
  if (withApostrophe !== t) add(withApostrophe)
  const noApostrophe = t.replace(/'/g, "").replace(/`/g, "").trim()
  if (noApostrophe && noApostrophe !== t) add(noApostrophe)
  if (t.includes(",")) {
    const [last, first] = t.split(",").map((s) => s.trim())
    if (first && last) add(`${first} ${last}`)
  } else {
    const parts = t.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) add(`${parts.slice(1).join(" ")}, ${parts[0]}`)
  }
  const lower = t.toLowerCase()
  if (lower.includes("zach ") && !lower.includes("zack ")) add(t.replace(/\bZach\b/gi, "Zack"))
  if (lower.includes("zack ") && !lower.includes("zach ")) add(t.replace(/\bZack\b/gi, "Zach"))
  if (lower.includes("ammon ") && !lower.includes("amon ")) add(t.replace(/\bAmmon\b/gi, "Amon"))
  if (lower.includes("amon ") && !lower.includes("ammon ")) add(t.replace(/\bAmon\b/gi, "Ammon"))
  for (const group of SAME_PERSON_ALIASES) {
    const tNorm = normalizeForAlias(t)
    const match = group.some((spelling) => normalizeForAlias(spelling) === tNorm)
    if (match) {
      for (const spelling of group) add(spelling)
      for (const s of group) {
        const noApo = s.replace(/'/g, "").replace(/\u2019/g, "").trim()
        if (noApo) add(noApo)
        const parts = s.split(/\s+/).filter(Boolean)
        if (parts.length >= 2) add(`${parts.slice(1).join(" ")}, ${parts[0]}`)
      }
      break
    }
  }
  const variants = [...set]
  const expanded = new Set<string>(variants)
  for (const v of variants) {
    if (v.includes(",")) continue
    const parts = v.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) expanded.add(`${parts.slice(1).join(" ")}, ${parts[0]}`)
  }
  for (const v of [...expanded]) {
    for (const alt of expandFirstNameEquivalents(v)) {
      expanded.add(alt)
      const ap = alt.split(/\s+/).filter(Boolean)
      if (ap.length >= 2) expanded.add(`${ap.slice(1).join(" ")}, ${ap[0]}`)
    }
  }
  return [...expanded]
}

function formatPlacement(p: number | string | null | undefined): string {
  if (p == null || p === "") return ""
  const n = typeof p === "number" ? p : parseInt(String(p), 10)
  if (isNaN(n)) return String(p)
  if (n === 1) return "Champion"
  if (n === 2) return "2nd All-American"
  if (n === 3) return "3rd All-American"
  if (n <= 8) return `${n}th All-American`
  return `${n}th Place`
}

/** NHSCA row `year` is tournament year (e.g. 2026). Allow +1 vs profile grad year for off-by-one entries and spring nationals vs class year. */
function nhscaYearUpperBound(graduationYear: number): number {
  return graduationYear + 1
}

/**
 * Default tournament year for `nhsca_roster` rows with no `year` / `tournament_year` column (legacy live import).
 * Prefer adding `tournament_year int` (or `year`) on the table so multiple NHSCA seasons scale without code changes.
 */
const NHSCA_ROSTER_DEFAULT_TOURNAMENT_YEAR = 2026

/** Resolve calendar year for this roster row — supports multi-year `nhsca_roster` once the column exists. */
function nhscaRosterRowTournamentYear(r: Record<string, unknown>): number {
  const y = r.tournament_year ?? r.nhsca_year ?? r.year
  if (y != null && y !== "") {
    const n = typeof y === "number" ? y : parseInt(String(y), 10)
    if (Number.isFinite(n) && n >= 1990 && n <= 2100) return n
  }
  return NHSCA_ROSTER_DEFAULT_TOURNAMENT_YEAR
}

function mapNhscaRosterRowToResult(r: Record<string, unknown>): TournamentResultRow {
  const wins = r.wins != null ? Number(r.wins) : null
  const losses = r.losses != null ? Number(r.losses) : null
  const record =
    wins != null && !Number.isNaN(wins) && losses != null && !Number.isNaN(losses)
      ? `${wins}-${losses}`
      : ""
  /** Championship finish only — never map `seed` into placement (seed ≠ AA place). */
  const placementRaw = r.placement
  return {
    year: nhscaRosterRowTournamentYear(r),
    placement: formatPlacement(placementRaw as number | string | null | undefined),
    record,
    weight: (r.weight_class ?? r.weight ?? "").toString().trim(),
    division: (r.classification ?? r.division ?? "").toString().trim(),
  }
}

/** True when roster `name` equals athlete display name after normalization / first-name variants. */
function nhscaRosterNameMatches(rowName: unknown, athleteName: string): boolean {
  const rn = normalizeApostrophes(String(rowName ?? "").trim()).toLowerCase()
  if (!rn) return false
  const variants = getNameVariants(athleteName).map((v) => normalizeApostrophes(v.trim()).toLowerCase())
  return variants.includes(rn)
}

/**
 * Fetch roster row(s) for this athlete. Uses substring ILIKE + in-memory match so trailing spaces / punctuation in DB still match.
 * @param matchAgainst — profile name (used for variant matching)
 * @param ilikeHint — optional first pattern (e.g. "Last, First") when different from matchAgainst
 */
async function queryNhscaRosterRowsByName(
  supabase: SupabaseClient,
  matchAgainst: string,
  ilikeHint?: string,
): Promise<Record<string, unknown>[]> {
  const tryRows = async (pattern: string) => {
    const { data, error } = await supabase.from("nhsca_roster").select("*").ilike("name", pattern).limit(120)
    if (error?.code === "42P01" || error?.message?.includes("does not exist")) return { rows: [] as Record<string, unknown>[], error }
    if (error) return { rows: [] as Record<string, unknown>[], error }
    const matched = (data ?? []).filter((r) => nhscaRosterNameMatches((r as Record<string, unknown>).name, matchAgainst))
    return { rows: matched as Record<string, unknown>[], error: null }
  }

  const firstPattern = normalizeApostrophes((ilikeHint ?? matchAgainst).trim())
  const { rows: exact, error: e1 } = await tryRows(firstPattern)
  if (e1?.code === "42P01" || e1?.message?.includes("does not exist")) return []
  if (exact.length) return exact

  const sub = `%${escapeForIlike(firstPattern)}%`
  const { rows: loose, error: e2 } = await tryRows(sub)
  if (e2?.code === "42P01" || e2?.message?.includes("does not exist")) return []
  return loose
}

/**
 * Live dashboard table `nhsca_roster`: NC kids, tournament record, optional placement.
 * Matches profile by name variants + NHSCA division vs graduation year (same rules as bracket dedupe).
 */
async function getNHSCAFromNhscaRosterTable(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear: number,
): Promise<TournamentResultRow[]> {
  const startYear = graduationYear - 4
  const yearMax = nhscaYearUpperBound(graduationYear)

  const mapRows = (raw: Record<string, unknown>[]): TournamentResultRow[] => {
    if (!raw.length) return []
    const inGradWindow = raw.filter((r) => {
      const y = nhscaRosterRowTournamentYear(r)
      return y >= startYear && y <= yearMax
    })
    const rowsToUse = inGradWindow.length ? inGradWindow : raw
    const asResults = rowsToUse.map((r) => mapNhscaRosterRowToResult(r))
    const scored = asResults.map((row, i) => {
      const ty = nhscaRosterRowTournamentYear(rowsToUse[i] as Record<string, unknown>)
      const want = preferredNhscaBracketKeyword(graduationYear, ty)
      return {
        row,
        score: want ? scoreNhscaDivisionMatch(rowsToUse[i].classification as string | undefined, want) : 0,
      }
    })
    const matched = scored.filter((s) => s.score > 0)
    const list = matched.length ? matched.map((s) => s.row) : asResults
    if (list.length === 1) return list
    const ty0 = nhscaRosterRowTournamentYear(rowsToUse[0] as Record<string, unknown>)
    const wantPick = preferredNhscaBracketKeyword(graduationYear, ty0) ?? "junior"
    const picked = pickNhscaRowWhenUnscored(list, wantPick)
    return picked ? [picked] : []
  }

  const primary = await queryNhscaRosterRowsByName(supabase, athleteName)
  if (primary.length) return mapRows(primary)

  const lastFirst = getNameVariants(athleteName).find((n) => n.includes(","))
  if (lastFirst) {
    const lf = await queryNhscaRosterRowsByName(supabase, athleteName, lastFirst)
    if (lf.length) return mapRows(lf)
  }

  for (const searchName of getNameVariants(athleteName)) {
    for (const pattern of getIlikePatternsForVariation(searchName)) {
      const { data: rows, error } = await supabase.from("nhsca_roster").select("*").ilike("name", pattern).limit(120)
      if (error?.code === "42P01" || error?.message?.includes("does not exist")) return []
      if (error) continue
      const matched = (rows ?? []).filter((r) => nhscaRosterNameMatches((r as Record<string, unknown>).name, athleteName))
      if (matched.length) return mapRows(matched as Record<string, unknown>[])
    }
  }
  return []
}

const mapPlacementRow = (p: any): TournamentResultRow => ({
  year: typeof p.year === "number" ? p.year : parseInt(String(p.year), 10) || new Date().getFullYear(),
  placement: formatPlacement(p.placement),
  record: (p.record ?? "").toString().trim(),
  weight: (p.weight_class ?? p.weight ?? "").toString().trim(),
  division: (p.division ?? "").toString().trim(),
})

const mapLegacyNhscaRow = (r: any): TournamentResultRow => ({
  year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
  placement: formatPlacement(r.placement ?? r.place),
  record: (r.record ?? r.record_text ?? "").toString().trim(),
  weight: (r.weight ?? "").toString().trim(),
  division: (r.division ?? "").toString().trim(),
})

/**
 * Combine roster + placements + legacy without dropping prior years.
 * For the same tournament `year`, **roster wins** over placement/legacy for that year only; all other placement rows (other years) are kept.
 */
export function mergeNhscaByYearPreferRoster(
  rosterRows: TournamentResultRow[],
  placementRows: TournamentResultRow[],
  legacyRows: TournamentResultRow[],
): TournamentResultRow[] {
  const rosterYears = new Set(rosterRows.map((r) => r.year))
  const out: TournamentResultRow[] = [...rosterRows]
  for (const p of placementRows) {
    if (!rosterYears.has(p.year)) out.push(p)
  }
  const covered = new Set<number>([...rosterYears])
  for (const p of placementRows) {
    if (!rosterYears.has(p.year)) covered.add(p.year)
  }
  for (const l of legacyRows) {
    if (!covered.has(l.year)) out.push(l)
  }
  out.sort((a, b) => b.year - a.year)
  return out
}

async function getNhscaPlacementsFromTablesForAthlete(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear: number,
  exactName: string,
): Promise<TournamentResultRow[]> {
  const startYear = graduationYear - 4
  const yearMax = nhscaYearUpperBound(graduationYear)

  const { data: exactPlacements } = await supabase
    .from("nhsca_placements")
    .select("*")
    .ilike("athlete_name", exactName)
    .gte("year", startYear)
    .lte("year", yearMax)
    .order("year", { ascending: false })
  if (exactPlacements?.length) return exactPlacements.map(mapPlacementRow)

  const lastFirst = getNameVariants(athleteName).find((n) => n.includes(","))
  if (lastFirst) {
    const { data: lfPlacements } = await supabase
      .from("nhsca_placements")
      .select("*")
      .ilike("athlete_name", lastFirst)
      .gte("year", startYear)
      .lte("year", yearMax)
      .order("year", { ascending: false })
    if (lfPlacements?.length) return lfPlacements.map(mapPlacementRow)
  }

  const namesToTry = getNameVariants(athleteName)
  for (const searchName of namesToTry) {
    for (const pattern of getIlikePatternsForVariation(searchName)) {
      const { data: placements } = await supabase
        .from("nhsca_placements")
        .select("*")
        .ilike("athlete_name", pattern)
        .gte("year", startYear)
        .lte("year", yearMax)
        .order("year", { ascending: false })
      if (placements?.length) return placements.map(mapPlacementRow)
    }
  }
  return []
}

async function getNhscaLegacyFromTablesForAthlete(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear: number,
  exactName: string,
): Promise<TournamentResultRow[]> {
  const startYear = graduationYear - 4
  const yearMax = nhscaYearUpperBound(graduationYear)

  const { data: exactNhsca } = await supabase
    .from("wrestling_nhsca_results")
    .select("*")
    .ilike("athlete_name", exactName)
    .gte("year", startYear)
    .lte("year", yearMax)
    .order("year", { ascending: false })
  if (exactNhsca?.length) return exactNhsca.map(mapLegacyNhscaRow)

  const lastFirst = getNameVariants(athleteName).find((n) => n.includes(","))
  if (lastFirst) {
    const { data: lfNhsca } = await supabase
      .from("wrestling_nhsca_results")
      .select("*")
      .ilike("athlete_name", lastFirst)
      .gte("year", startYear)
      .lte("year", yearMax)
      .order("year", { ascending: false })
    if (lfNhsca?.length) return lfNhsca.map(mapLegacyNhscaRow)
  }

  const namesToTry = getNameVariants(athleteName)
  for (const searchName of namesToTry) {
    for (const pattern of getIlikePatternsForVariation(searchName)) {
      const { data: results } = await supabase
        .from("wrestling_nhsca_results")
        .select("*")
        .ilike("athlete_name", pattern)
        .gte("year", startYear)
        .lte("year", yearMax)
        .order("year", { ascending: false })
      if (results?.length) return results.map(mapLegacyNhscaRow)
    }
  }
  return []
}

/**
 * Fetch NHSCA: **merge** nhsca_roster (live — wins/losses, placement when set) + nhsca_placements + wrestling_nhsca_results.
 * Same calendar year: roster overwrites import/legacy. Different years: all kept (e.g. 2025 import + 2026 roster).
 */
export async function getNHSCAFromTables(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear: number
): Promise<TournamentResultRow[]> {
  if (!athleteName?.trim() || !graduationYear || isNaN(graduationYear)) return []
  const exactName = normalizeApostrophes(athleteName.trim())

  const [rosterRows, placementRows, legacyRows] = await Promise.all([
    getNHSCAFromNhscaRosterTable(supabase, athleteName, graduationYear),
    getNhscaPlacementsFromTablesForAthlete(supabase, athleteName, graduationYear, exactName),
    getNhscaLegacyFromTablesForAthlete(supabase, athleteName, graduationYear, exactName),
  ])

  const merged = mergeNhscaByYearPreferRoster(rosterRows, placementRows, legacyRows)
  return merged
}

/**
 * NHSCA imports use the same tournament `year` (e.g. 2026) for both Senior and Junior brackets.
 * Merging by year-only Map dropped one bracket — e.g. Class of 2027 (Junior) lost rows when Senior won.
 * Pick the row whose `division` matches the athlete's expected bracket for (gradYear, tournamentYear).
 */
export function dedupeNhscaByYearForGradYear(rows: TournamentResultRow[], gradYear: number): TournamentResultRow[] {
  if (!rows.length || !Number.isFinite(gradYear)) return rows
  const byYear = new Map<number, TournamentResultRow[]>()
  for (const r of rows) {
    const y = typeof r.year === "number" ? r.year : parseInt(String(r.year), 10)
    if (!Number.isFinite(y)) continue
    if (!byYear.has(y)) byYear.set(y, [])
    byYear.get(y)!.push(r)
  }
  const out: TournamentResultRow[] = []
  for (const y of [...byYear.keys()].sort((a, b) => b - a)) {
    const list = byYear.get(y)!
    if (list.length === 1) {
      out.push(list[0])
      continue
    }
    const want = preferredNhscaBracketKeyword(gradYear, y)
    if (!want) {
      recruitNcDebugLogNhsca("nhscaBracketDedupe:gradMinusTOutOfRange", {
        tournamentYear: y,
        gradYear,
        gradMinusT: gradYear - y,
        fallback: "list[0]",
      })
      out.push(list[0])
      continue
    }
    const matches = list.filter((r) => scoreNhscaDivisionMatch(r.division, want) > 0)
    const picked = matches.length ? matches[0] : pickNhscaRowWhenUnscored(list, want)
    recruitNcDebugLogNhsca("nhscaBracketDedupe:multiRowSameYear", {
      tournamentYear: y,
      gradYear,
      wantBracket: want,
      candidateCount: list.length,
      scoredMatchCount: matches.length,
      usedScoredMatch: matches.length > 0,
      division: (picked.division ?? "").trim(),
      record: (picked.record ?? "").toString().trim().slice(0, 32),
    })
    out.push(picked)
  }
  return out
}

/** NHSCA bracket vs profile `graduationyear`: same tournament year (e.g. 2026), Senior cohort = grad 2026, Junior cohort = grad 2027 → d=0 vs d=1. */
function preferredNhscaBracketKeyword(gradYear: number, tournamentYear: number): string | null {
  const d = gradYear - tournamentYear
  if (d === 0) return "senior"
  if (d === 1) return "junior"
  if (d === 2) return "sophomore"
  if (d === 3) return "freshman"
  return null
}

function divisionExplicitlyJunior(division: string | undefined): boolean {
  const d = (division ?? "").trim().toLowerCase()
  if (!d) return false
  return d.includes("junior") || d === "jr" || /\bjr\.?\b/.test(d)
}

function divisionExplicitlySenior(division: string | undefined): boolean {
  const d = (division ?? "").trim().toLowerCase()
  if (!d) return false
  return d.includes("senior") || d.includes("varsity") || d === "sr" || /\bsr\.?\b/.test(d)
}

function divisionExplicitlySophomore(division: string | undefined): boolean {
  const d = (division ?? "").trim().toLowerCase()
  if (!d) return false
  return d.includes("sophomore") || /\bsoph\b/.test(d)
}

function divisionExplicitlyFreshman(division: string | undefined): boolean {
  const d = (division ?? "").trim().toLowerCase()
  if (!d) return false
  return d.includes("freshman") || d.includes("frosh") || d === "fr" || /\bfr\b/.test(d)
}

function scoreNhscaDivisionMatch(division: string | undefined, want: string): number {
  const d = (division ?? "").trim().toLowerCase()
  if (!d) return 0
  if (want === "senior" && (d.includes("senior") || d.includes("varsity") || d === "sr" || /\bsr\b/.test(d))) return 2
  if (want === "junior" && (d.includes("junior") || d === "jr" || /\bjr\b/.test(d))) return 2
  if (want === "sophomore" && (d.includes("sophomore") || d.includes("soph"))) return 2
  if (want === "freshman" && (d.includes("freshman") || d.includes("frosh") || d === "fr" || /\bfr\b/.test(d))) return 2
  if (d.includes(want)) return 2
  return 0
}

/**
 * When scoreNhscaDivisionMatch finds nothing (empty division, "HS", vendor-specific labels),
 * same calendar year can still have Senior + Junior rows for different athletes with the same name.
 * Prefer the row that is NOT the opposite bracket before falling back to arbitrary list[0].
 */
function pickNhscaRowWhenUnscored(list: TournamentResultRow[], want: string): TournamentResultRow {
  if (list.length === 1) return list[0]
  if (want === "senior") {
    const notJunior = list.filter((r) => !divisionExplicitlyJunior(r.division))
    if (notJunior.length === 1) return notJunior[0]
    if (notJunior.length > 0) {
      const withSenior = notJunior.filter((r) => divisionExplicitlySenior(r.division))
      if (withSenior.length === 1) return withSenior[0]
      return notJunior[0]
    }
  }
  if (want === "junior") {
    const notSenior = list.filter((r) => !divisionExplicitlySenior(r.division))
    if (notSenior.length === 1) return notSenior[0]
    if (notSenior.length > 0) {
      const withJunior = notSenior.filter((r) => divisionExplicitlyJunior(r.division))
      if (withJunior.length === 1) return withJunior[0]
      return notSenior[0]
    }
  }
  if (want === "sophomore") {
    const withSo = list.filter((r) => divisionExplicitlySophomore(r.division))
    if (withSo.length === 1) return withSo[0]
    if (withSo.length > 0) return withSo[0]
    const notSrJr = list.filter(
      (r) => !divisionExplicitlySenior(r.division) && !divisionExplicitlyJunior(r.division),
    )
    if (notSrJr.length === 1) return notSrJr[0]
    if (notSrJr.length > 0) return notSrJr[0]
  }
  if (want === "freshman") {
    const withFr = list.filter((r) => divisionExplicitlyFreshman(r.division))
    if (withFr.length === 1) return withFr[0]
    if (withFr.length > 0) return withFr[0]
    const notOlder = list.filter(
      (r) =>
        !divisionExplicitlySenior(r.division) &&
        !divisionExplicitlyJunior(r.division) &&
        !divisionExplicitlySophomore(r.division),
    )
    if (notOlder.length === 1) return notOlder[0]
    if (notOlder.length > 0) return notOlder[0]
  }
  return list[0]
}

const ALL_TIME_YEAR_MIN = 2000
const ALL_TIME_YEAR_MAX = 2035

/**
 * Fetch NHSCA for all years (no grad-year window). Use for all-time stats (e.g. Blue page tiles).
 */
export async function getNHSCAFromTablesAllTime(
  supabase: SupabaseClient,
  athleteName: string
): Promise<TournamentResultRow[]> {
  if (!athleteName?.trim()) return []
  const namesToTry = getNameVariants(athleteName)

  for (const searchName of namesToTry) {
    for (const pattern of getIlikePatternsForVariation(searchName)) {
      const { data: placements } = await supabase
        .from("nhsca_placements")
        .select("*")
        .ilike("athlete_name", pattern)
        .gte("year", ALL_TIME_YEAR_MIN)
        .lte("year", ALL_TIME_YEAR_MAX)
        .order("year", { ascending: false })

      if (placements?.length) {
        return placements.map((p: any) => ({
          year: typeof p.year === "number" ? p.year : parseInt(String(p.year), 10) || new Date().getFullYear(),
          placement: formatPlacement(p.placement),
          record: (p.record ?? "").toString().trim(),
          weight: (p.weight_class ?? p.weight ?? "").toString().trim(),
          division: (p.division ?? "").toString().trim(),
        }))
      }

      const { data: results } = await supabase
        .from("wrestling_nhsca_results")
        .select("*")
        .ilike("athlete_name", pattern)
        .gte("year", ALL_TIME_YEAR_MIN)
        .lte("year", ALL_TIME_YEAR_MAX)
        .order("year", { ascending: false })

      if (results?.length) {
        return results.map((r: any) => ({
          year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
          placement: formatPlacement(r.placement ?? r.place),
          record: (r.record ?? r.record_text ?? "").toString().trim(),
          weight: (r.weight ?? "").toString().trim(),
          division: (r.division ?? "").toString().trim(),
        }))
      }
    }
  }

  return []
}

/**
 * Fetch Super32 from super32_results table.
 * Tries exact match first so DB "Jackson D'Ettore" matches without ILIKE issues.
 */
export async function getSuper32FromTable(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear: number,
  options?: { highSchool?: string }
): Promise<TournamentResultRow[]> {
  if ((!athleteName?.trim() && !options?.highSchool?.trim()) || !graduationYear || isNaN(graduationYear)) return []
  const startYear = graduationYear - 4
  const exactName = normalizeApostrophes(athleteName.trim())

  const filterBySchool = (rows: any[]) => {
    if (!options?.highSchool?.trim() || rows.length === 0) return rows
    const school = options.highSchool.trim().toLowerCase()
    const filtered = rows.filter((r: any) => {
      const rowSchool = (r.high_school ?? r.school ?? "").toString().toLowerCase()
      return !rowSchool || rowSchool.includes(school) || school.includes(rowSchool)
    })
    return filtered.length > 0 ? filtered : rows
  }

  const { data: exactRows } = await supabase
    .from("super32_results")
    .select("*")
    .eq("athlete_name", exactName)
    .gte("year", startYear)
    .lte("year", graduationYear)
    .order("year", { ascending: false })
  if (exactRows?.length) return dedupeSuper32ByYear(mapSuper32Rows(filterBySchool(exactRows)))

  const lastFirst = getNameVariants(athleteName).find((n) => n.includes(","))
  if (lastFirst) {
    const { data: lfRows } = await supabase
      .from("super32_results")
      .select("*")
      .eq("athlete_name", lastFirst)
      .gte("year", startYear)
      .lte("year", graduationYear)
      .order("year", { ascending: false })
    if (lfRows?.length) return dedupeSuper32ByYear(mapSuper32Rows(filterBySchool(lfRows)))
  }

  for (const searchName of getNameVariants(athleteName)) {
    for (const namePattern of getIlikePatternsForVariation(searchName)) {
      const { data: byName } = await supabase
        .from("super32_results")
        .select("*")
        .ilike("athlete_name", namePattern)
        .gte("year", startYear)
        .lte("year", graduationYear)
        .order("year", { ascending: false })

      const rows = filterBySchool(byName ?? [])
      if (rows.length) return dedupeSuper32ByYear(mapSuper32Rows(rows))
    }
  }

  return []
}

/**
 * Fetch Super32 for all years (no grad-year window). Use for all-time stats (e.g. Blue page tiles).
 */
export async function getSuper32FromTableAllTime(
  supabase: SupabaseClient,
  athleteName: string,
  options?: { highSchool?: string }
): Promise<TournamentResultRow[]> {
  if (!athleteName?.trim() && !options?.highSchool?.trim()) return []

  for (const searchName of getNameVariants(athleteName)) {
    for (const namePattern of getIlikePatternsForVariation(searchName)) {
      const { data: byName } = await supabase
        .from("super32_results")
        .select("*")
        .ilike("athlete_name", namePattern)
        .gte("year", ALL_TIME_YEAR_MIN)
        .lte("year", ALL_TIME_YEAR_MAX)
        .order("year", { ascending: false })

      let rows = byName ?? []
      if (options?.highSchool?.trim() && rows.length > 0) {
        const school = options.highSchool.trim().toLowerCase()
        const filtered = rows.filter((r: any) => {
          const rowSchool = (r.high_school ?? r.school ?? "").toString().toLowerCase()
          return !rowSchool || rowSchool.includes(school) || school.includes(rowSchool)
        })
        rows = filtered.length > 0 ? filtered : rows
      }
      if (rows.length) return dedupeSuper32ByYear(mapSuper32Rows(rows))
    }
  }

  return []
}

/** One row per year (avoids duplicate 2024 entries from table/imports). */
function dedupeSuper32ByYear(rows: TournamentResultRow[]): TournamentResultRow[] {
  const byYear = new Map<number, TournamentResultRow>()
  for (const row of rows) {
    const y = typeof row.year === "number" ? row.year : parseInt(String(row.year), 10)
    if (!byYear.has(y)) byYear.set(y, row)
  }
  return Array.from(byYear.values()).sort((a, b) => (b.year as number) - (a.year as number))
}

function mapSuper32Rows(rows: any[]): TournamentResultRow[] {
  return rows.map((r: any) => {
    const record = (r.record ?? "").toString().trim()
    const derivedRecord = !record && (r.wins != null || r.losses != null)
      ? `${r.wins ?? 0}-${r.losses ?? 0}`
      : record
    return {
      year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
      placement: formatPlacement(r.placement ?? r.place),
      record: derivedRecord,
      weight: (r.weight ?? r.weight_class ?? "").toString().trim(),
    }
  })
}

/** NC United National Team result row (Ultimate Club Duals, NHSCA National Duals) */
export interface NationalTeamResultRow {
  event: string
  year: number
  record: string
}

/**
 * NC United National Team event: Ultimate Club Duals or NHSCA National Duals.
 * NHSCA: match "NHSCA Duals", "NHSCA National Duals", "NHSCA Dual", "NHSCA Dual Meet", etc.
 */
function isNationalTeamEvent(tournamentName: string): { event: string } | null {
  const t = tournamentName.toLowerCase()
  if (t.includes("ultimate club duals")) return { event: "Ultimate Club Duals" }
  if (t.includes("nhsca") && (t.includes("national duals") || t.includes("duals") || t.includes("dual"))) return { event: "NHSCA National Duals" }
  return null
}

/**
 * Fetch NC United National Team results (Ultimate Club Duals, NHSCA National Duals) from nc_united tables.
 * Schema: scripts/155-create-nc-united-national-team-schema.sql
 * Data: 156-insert-nhsca-2025-data.sql, 157-insert-ucd-2024-data.sql, 158-insert-ucd-2025-data.sql
 * Tables: nc_united_tournament_results + nc_united_wrestlers + nc_united_tournaments.
 * Falls back gracefully if tables don't exist.
 */
export async function getUltimateClubDualsFromTables(
  supabase: SupabaseClient,
  athleteName: string,
  highSchool?: string
): Promise<NationalTeamResultRow[]> {
  if (!athleteName?.trim()) return []
  const nameTrim = athleteName.trim().toLowerCase()
  const parts = athleteName.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return []

  const last = parts.slice(1).join(" ")
  const first = parts[0] ?? ""

  try {
    /** Resolve wrestlers by last name first, then match full name in memory — avoids loading 2000 arbitrary tournament rows per profile. */
    const { data: wrestlers, error: wErr } = await supabase
      .from("nc_united_wrestlers")
      .select("id, first_name, last_name, high_school")
      .ilike("last_name", `%${escapeForIlike(last)}%`)
      .limit(200)

    if (wErr?.code === "42P01" || wErr?.message?.includes("does not exist")) return []

    const matchedIds = (wrestlers ?? [])
      .filter((w: any) => {
        const f = (w.first_name ?? "").toString().trim().toLowerCase()
        const l = (w.last_name ?? "").toString().trim().toLowerCase()
        const full = `${f} ${l}`.trim()
        if (!full) return false
        if (full.includes(nameTrim) || nameTrim.includes(full)) return true
        return f === first.toLowerCase() && l === last.toLowerCase()
      })
      .map((w: any) => w.id)

    if (!matchedIds.length) return []

    let data: any[] | null = null
    const q1 = await supabase
      .from("nc_united_tournament_results")
      .select("record, wins, losses, nc_united_wrestlers(first_name, last_name, high_school), nc_united_tournaments(name, year)")
      .in("wrestler_id", matchedIds)
    if (!q1.error && q1.data?.length !== undefined) {
      data = q1.data as any[]
    }
    if (!data?.length && (q1.error?.code === "42703" || q1.error?.message?.includes("relation"))) {
      const q2 = await supabase
        .from("nc_united_tournament_results")
        .select("record, wins, losses, wrestler(first_name, last_name, high_school), tournament(name, year)")
        .in("wrestler_id", matchedIds)
      if (!q2.error && q2.data) data = q2.data as any[]
    }
    if (!data?.length) return []
    return buildNationalTeamRows(data, nameTrim, highSchool ?? "")
  } catch {
    return []
  }
}

function buildNationalTeamRows(
  results: any[],
  nameTrim: string,
  highSchool: string
): NationalTeamResultRow[] {
  const rows: NationalTeamResultRow[] = []
  const seenKeys = new Set<string>()
  for (const r of results) {
    const wrestler = r.nc_united_wrestlers ?? r.wrestler
    const tournament = r.nc_united_tournaments ?? r.tournament
    if (!wrestler || !tournament) continue
    const tName = (tournament.name ?? "").toString()
    const eventInfo = isNationalTeamEvent(tName)
    if (!eventInfo) continue
    const year = typeof tournament.year === "number" ? tournament.year : parseInt(String(tournament.year), 10)
    if (year < 2023 || year > 2026) continue
    const f = (wrestler.first_name ?? wrestler.firstname ?? "").toString().trim()
    const l = (wrestler.last_name ?? wrestler.lastname ?? "").toString().trim()
    const fullName = `${f} ${l}`.trim().toLowerCase()
    if (!fullName) continue
    if (!fullName.includes(nameTrim) && !nameTrim.includes(fullName) && !namesMatch(nameTrim, fullName)) continue
    const rowSchool = (wrestler.high_school ?? wrestler.highschool ?? "").toString().trim().toLowerCase()
    const athleteSchool = highSchool.trim().toLowerCase()
    if (rowSchool && athleteSchool && !rowSchool.includes(athleteSchool) && !athleteSchool.includes(rowSchool)) continue
    const yearKey = `${eventInfo.event}|${year}`
    if (seenKeys.has(yearKey)) continue
    seenKeys.add(yearKey)
    const record = (r.record ?? "").toString().trim()
    const derivedRecord = record || (r.wins != null || r.losses != null ? `${r.wins ?? 0}-${r.losses ?? 0}` : "")
    if (!derivedRecord) continue
    rows.push({ event: eventInfo.event, year, record: derivedRecord })
  }
  return rows.sort((a, b) => b.year - a.year)
}

function namesMatch(a: string, b: string): boolean {
  const aParts = a.split(/\s+/).filter(Boolean)
  const bParts = b.split(/\s+/).filter(Boolean)
  if (!aParts.length || !bParts.length) return false
  const aFirst = aParts[0] ?? ""
  const aLast = aParts.slice(1).join(" ") || ""
  const bFirst = bParts[0] ?? ""
  const bLast = bParts.slice(1).join(" ") || ""
  return aFirst.toLowerCase() === bFirst.toLowerCase() && aLast.toLowerCase() === bLast.toLowerCase()
}
