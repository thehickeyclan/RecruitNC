/**
 * Parse "show me the results of…" / "who was an NHSCA All-American in…" style questions.
 */

export type TournamentResultsKind = "nhsca_all_americans" | "nchsaa_state" | "fargo_nationals"

export type ParsedTournamentResultsQuery = {
  kind: TournamentResultsKind
  year: number
  gender: "men" | "women"
  /** NCHSAA classification when user asks for a specific division (e.g. 4A, 1A/2A, 1-4A). */
  classification: string | null
}

const YEAR_RE = /\b(19\d{2}|20\d{2})\b/

export const NCHSAA_CLASSIFICATIONS = [
  "1-4A",
  "1A/2A",
  "1A",
  "2A",
  "3A",
  "4A",
  "5A",
  "6A",
  "7A",
  "8A",
] as const

function extractYear(text: string): number | null {
  const m = text.match(YEAR_RE)
  if (!m) return null
  const y = parseInt(m[1], 10)
  if (y < 1990 || y > 2035) return null
  return y
}

/** Parse NCHSAA division from natural language (4A, 4a, 1A/2A, 1-4A, etc.). */
export function extractNchsaaClassification(text: string): string | null {
  if (/\b1\s*[-–]\s*4\s*a\b/i.test(text)) return "1-4A"
  if (/\b1\s*a\s*\/\s*2\s*a\b/i.test(text)) return "1A/2A"

  const patterns = [
    /(?:show|list|get|all)\s+(?:me\s+)?(?:all\s+)?(?:the\s+)?(\d+)\s*[aA]\s+state\s+placers?/i,
    /(?:show|list|get|all)\s+(?:me\s+)?(?:all\s+)?(?:the\s+)?(\d+)\s*[aA]\s+state\s+(?:results?|championships?)/i,
    /(\d+)\s*[aA]\s+state\s+(?:placers?|results?|championships?)/i,
    /state\s+placers?\s+(?:from|in|at|for)?\s*(?:the\s+)?(?:year\s+)?(?:\d{4}\s+)?(\d+)\s*[aA]\b/i,
    /(?:at|in)\s+(\d+)\s*[aA]\s+(?:states|state)\b/i,
    /(\d+)\s*[aA]\s+\d{4}\s+state/i,
    /(\d+)\s*[aA]\s+states\b/i,
    /(?:placers?|placer)\s+(\d+)\s*[aA]\b/i,
    /(?:show|list|get|all)\s+(?:me\s+)?(?:all\s+)?(\d+)\s*[aA]\s+placers?\b/i,
    /(\d+)\s*[aA]\s+placers?\s+(?:from|in|at|for)\s+\d{4}/i,
  ]

  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const div = `${m[1]}A`
      if (NCHSAA_CLASSIFICATIONS.includes(div as (typeof NCHSAA_CLASSIFICATIONS)[number])) return div
    }
  }

  const lower = text.toLowerCase()
  const tokens = lower.match(/\b(\d+)\s*[aA]\b/g)
  if (tokens) {
    for (const token of tokens) {
      const num = parseInt(token, 10)
      if (num < 1 || num > 8) continue
      const idx = lower.indexOf(token)
      const after = lower.slice(idx + token.length, idx + token.length + 10)
      if (/^\s*(?:lbs|lb|pounds)\b/.test(after)) continue
      if (/^\s*\d{3}\b/.test(after)) continue
      return `${num}A`
    }
  }

  return null
}

/** Match a DB classification value to a user-requested division. */
export function matchesNchsaaClassificationFilter(
  rowClassification: string,
  filter: string,
  year: number,
): boolean {
  const row = rowClassification.trim()
  const f = filter.trim().toUpperCase()

  if (f === "1-4A") return row === "1-4A"
  if (f === "1A/2A") {
    if (row === "1A/2A") return true
    if (year < 2026 && (row === "1A" || row === "2A")) return true
    return false
  }
  if (f === "1A" || f === "2A") {
    if (year >= 2026) return row === "1A/2A" || row === f
    return row === f || row === "1A/2A"
  }

  const rowUpper = row.replace(/\s/g, "").toUpperCase()
  if (rowUpper === f) return true
  const num = f.replace(/A$/, "")
  return rowUpper === num || rowUpper === `${num}A` || rowUpper.startsWith(`${num}A`)
}

function detectGender(lower: string): "men" | "women" {
  const isWomen =
    (/\b(women|woman|girls?|female)\b/.test(lower) &&
      !/\b(men|man|boys?|male)\b/.test(lower)) ||
    /\bgirls?\s+division/.test(lower)
  if (isWomen) return "women"
  return "men"
}

function detectKind(lower: string, classification: string | null): TournamentResultsKind | null {
  const hasAllAmerican = /\ball[\s-]?americans?\b/.test(lower)
  const hasFargo =
    /\bfargo\b/.test(lower) ||
    /\bus\s+marine\s+corps\s+nationals?\b/.test(lower) ||
    /\bnationals?\s+in\s+fargo\b/.test(lower)
  const hasNhsca =
    /\bnhsca\b/.test(lower) ||
    /\bnhsca\s+nationals?\b/.test(lower) ||
    (hasAllAmerican && /\bnationals?\b/.test(lower) && !hasFargo)
  const hasState =
    /\bnchsaa\b/.test(lower) ||
    /\bstate tournament\b/.test(lower) ||
    /\bstate championships?\b/.test(lower) ||
    /\bstate wrestling\b/.test(lower) ||
    /\bstate results\b/.test(lower) ||
    /\bstate placers?\b/.test(lower) ||
    (classification != null && /\bplacers?\b/.test(lower)) ||
    (classification != null && /\bstate\b/.test(lower)) ||
    (/\bstate\b/.test(lower) && /\btournament\b/.test(lower))

  if (hasFargo) return "fargo_nationals"
  if (hasNhsca || (hasAllAmerican && !hasState)) return "nhsca_all_americans"
  if (hasState && !hasAllAmerican) return "nchsaa_state"
  if (hasState && hasAllAmerican) return "nhsca_all_americans"
  if (classification && !hasNhsca && !hasAllAmerican && !hasFargo) return "nchsaa_state"
  return null
}

function isTournamentResultsListingQuery(lower: string): boolean {
  return (
    /show\s+(?:me\s+)?(?:the\s+)?results\s+of/.test(lower) ||
    /(?:give|get)\s+(?:me\s+)?(?:the\s+)?results\s+of/.test(lower) ||
    /\bresults\s+of\s+(?:the\s+)?/.test(lower) ||
    /\bresults\s+from\s+(?:the\s+)?/.test(lower) ||
    /\bwhat\s+(?:were|was)\s+(?:the\s+)?(?:\d{4}\s+)?(?:\d+[aA]\s+)?(?:nchsaa\s+)?state/.test(lower) ||
    /who\s+(?:was|were)\s+(?:an?\s+)?(?:the\s+)?(?:nhsca\s+)?all[\s-]?americans?\b/.test(lower) ||
    /(?:list|show)\s+(?:all\s+)?(?:the\s+)?(?:nhsca\s+)?all[\s-]?americans?\b/.test(lower) ||
    /(?:nhsca\s+)?all[\s-]?americans?\s+(?:from|in|at|for)\s+(?:the\s+)?(?:year\s+)?\d{4}/.test(lower) ||
    /(?:nchsaa\s+)?state\s+(?:tournament|championships?|results|placers?)\b/.test(lower) ||
    /\d{4}\s+(?:nchsaa\s+)?state\s+(?:tournament|championships?|results)\b/.test(lower) ||
    /\b\d+[aA]\s+state\s+(?:placers?|results?|championships?)\b/.test(lower) ||
    /(?:show|list|get|all)\s+(?:me\s+)?(?:all\s+)?(?:the\s+)?\d+[aA]\s+state\s+placers?\b/.test(lower) ||
    /(?:show|list|get|all)\s+(?:me\s+)?(?:all\s+)?\d+[aA]\s+placers?\b/.test(lower) ||
    /\b\d+[aA]\s+placers?\s+(?:from|in|at|for)\s+\d{4}\b/.test(lower) ||
    (/\bnhsca\s+(?:nationals?|results?|placements?)\b/.test(lower) && YEAR_RE.test(lower)) ||
    (/\bnhsca\b/.test(lower) && /\bresults\b/.test(lower) && YEAR_RE.test(lower)) ||
    /\d{4}\s+nhsca\b/.test(lower) ||
    /\bfargo\b/.test(lower) ||
    /\bfargo\s+(?:nationals?|results?)\b/.test(lower) ||
    /\b(?:show|list|get)\s+(?:me\s+)?(?:nc\s+)?fargo\b/.test(lower) ||
    /\bwho\s+wrestled\s+(?:at\s+)?fargo\b/.test(lower)
  )
}

export function parseTournamentResultsQuery(message: string): ParsedTournamentResultsQuery | null {
  const trimmed = message.trim()
  if (trimmed.length < 8) return null
  const lower = trimmed.toLowerCase()

  if (!isTournamentResultsListingQuery(lower)) return null

  const year = extractYear(trimmed)
  if (year == null) return null

  const classification = extractNchsaaClassification(trimmed)

  const kind = detectKind(lower, classification)
  if (!kind) return null

  return { kind, year, gender: detectGender(lower), classification }
}

export type NhscaAllAmericanRow = {
  athlete_name: string
  placement: number
  year: number
  division: string | null
  weight_class: string | null
  high_school: string | null
}

/** Numeric weight only — merges "145", "145lbs", and "145 lbs" for dedupe. */
export function normalizeNhscaWeightDigits(weight: string | number | null | undefined): string {
  const w = weight == null ? "" : String(weight).trim()
  if (!w) return ""
  const num = w.replace(/\D/g, "")
  return num || w.toLowerCase()
}

export function normalizeNhscaAthleteNameForDedup(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/** One placer per year/division/weight/placement — names may differ across duplicate imports. */
export function nhscaAllAmericanSlotKey(
  row: Pick<NhscaAllAmericanRow, "year" | "placement" | "division" | "weight_class">,
): string {
  return [
    row.year,
    row.placement,
    (row.division ?? "").trim().toLowerCase(),
    normalizeNhscaWeightDigits(row.weight_class),
  ].join("|")
}

/** @deprecated Prefer nhscaAllAmericanSlotKey — athlete names vary across duplicate rows. */
export function nhscaAllAmericanDedupKey(
  row: Pick<NhscaAllAmericanRow, "athlete_name" | "year" | "placement" | "division" | "weight_class">,
): string {
  return [
    normalizeNhscaAthleteNameForDedup(row.athlete_name),
    row.year,
    row.placement,
    (row.division ?? "").trim().toLowerCase(),
    normalizeNhscaWeightDigits(row.weight_class),
  ].join("|")
}

function schoolNameTokens(school: string | null | undefined): string[] {
  if (!school) return []
  return school
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
}

function trailingNameTokensLookLikeSchool(
  longerName: string,
  shorterName: string,
  schools: string[],
): boolean {
  const extra = longerName.slice(shorterName.length).trim().toLowerCase()
  if (!extra) return false
  const schoolText = schools.join(" ")
  return extra.split(/\s+/).some((t) => t.length > 2 && schoolText.includes(t))
}

export function pickBetterNhscaAthleteName(
  a: string,
  b: string,
  schoolA: string | null,
  schoolB: string | null,
): string {
  const trimA = a.trim()
  const trimB = b.trim()
  if (!trimB) return trimA
  if (!trimA) return trimB

  const lowerA = trimA.toLowerCase()
  const lowerB = trimB.toLowerCase()
  if (lowerA === lowerB) return trimA.length >= trimB.length ? trimA : trimB

  const schools = [...schoolNameTokens(schoolA), ...schoolNameTokens(schoolB)]

  if (lowerB.startsWith(`${lowerA} `)) {
    if (trailingNameTokensLookLikeSchool(trimB, trimA, schools)) return trimA
    return trimA
  }
  if (lowerA.startsWith(`${lowerB} `)) {
    if (trailingNameTokensLookLikeSchool(trimA, trimB, schools)) return trimB
    return trimB
  }

  return trimA.length >= trimB.length ? trimA : trimB
}

export type NhscaAllAmericanMergeRow = NhscaAllAmericanRow & {
  source?: "placements" | "legacy"
}

export function mergeNhscaAllAmericanRows(
  existing: NhscaAllAmericanMergeRow,
  incoming: NhscaAllAmericanMergeRow,
): NhscaAllAmericanMergeRow {
  const existingSchool = (existing.high_school ?? "").trim()
  const incomingSchool = (incoming.high_school ?? "").trim()
  const high_school =
    incomingSchool.length > existingSchool.length ? incoming.high_school : existing.high_school
  const weight =
    normalizeNhscaWeightDigits(existing.weight_class) ||
    normalizeNhscaWeightDigits(incoming.weight_class) ||
    null

  const preferPlacementsName =
    existing.source === "placements" && incoming.source === "legacy"
      ? existing.athlete_name
      : incoming.source === "placements" && existing.source === "legacy"
        ? incoming.athlete_name
        : null

  const athlete_name =
    preferPlacementsName ??
    pickBetterNhscaAthleteName(
      existing.athlete_name,
      incoming.athlete_name,
      existing.high_school,
      incoming.high_school,
    )

  return {
    athlete_name,
    placement: existing.placement,
    year: existing.year,
    division: existing.division,
    high_school,
    weight_class: weight,
    source: existing.source === "placements" || incoming.source === "placements" ? "placements" : existing.source ?? incoming.source,
  }
}

/** Collapse duplicate imports for the same bracket slot (year/division/weight/placement). */
export function dedupeNhscaAllAmericanRows(rows: NhscaAllAmericanMergeRow[]): NhscaAllAmericanRow[] {
  const map = new Map<string, NhscaAllAmericanMergeRow>()
  for (const row of rows) {
    const normalized: NhscaAllAmericanMergeRow = {
      athlete_name: row.athlete_name.trim(),
      placement: row.placement,
      year: row.year,
      division: row.division?.trim() ?? null,
      weight_class: normalizeNhscaWeightDigits(row.weight_class) || row.weight_class,
      high_school: row.high_school?.trim() ?? null,
      source: row.source,
    }
    const key = nhscaAllAmericanSlotKey(normalized)
    const prev = map.get(key)
    map.set(key, prev ? mergeNhscaAllAmericanRows(prev, normalized) : normalized)
  }
  return [...map.values()].map(({ source: _source, ...row }) => row)
}

export function formatNhscaWeightLabel(weight: string | number | null | undefined): string {
  const digits = normalizeNhscaWeightDigits(weight)
  return digits ? ` ${digits} lbs` : ""
}

export type NchsaaStateResultRow = {
  wrestler_name: string
  place: number
  year: number
  classification: string
  weight_class: string
  school: string | null
}

function placeSuffix(place: number): string {
  if (place === 1) return "1st"
  if (place === 2) return "2nd"
  if (place === 3) return "3rd"
  return `${place}th`
}

function sortDivision(a: string, b: string): number {
  const order = ["Freshman", "Sophomore", "Junior", "Senior"]
  const ai = order.indexOf(a)
  const bi = order.indexOf(b)
  if (ai !== -1 && bi !== -1) return ai - bi
  if (ai !== -1) return -1
  if (bi !== -1) return 1
  return a.localeCompare(b)
}

export function formatNhscaAllAmericansAnswer(
  parsed: ParsedTournamentResultsQuery,
  rows: NhscaAllAmericanRow[],
): string {
  const genderLabel = parsed.gender === "women" ? "Women's" : "Men's"
  if (rows.length === 0) {
    return `I don't see any ${genderLabel.toLowerCase()} NHSCA All-Americans (placements 1–8) for **${parsed.year}** in our database.`
  }

  const byDivision: Record<string, NhscaAllAmericanRow[]> = {}
  for (const row of rows) {
    const div = (row.division || "Unknown").trim()
    if (!byDivision[div]) byDivision[div] = []
    byDivision[div].push(row)
  }

  const lines: string[] = [
    `Here are **${rows.length}** ${genderLabel} NHSCA All-Americans from **${parsed.year}** (placements 1–8):`,
    "",
  ]

  const divisions = Object.keys(byDivision).sort(sortDivision)
  const displayCap = 150
  let shown = 0

  for (const div of divisions) {
    const group = byDivision[div].sort((a, b) => {
      const wa = parseInt(String(a.weight_class ?? "999"), 10)
      const wb = parseInt(String(b.weight_class ?? "999"), 10)
      if (wa !== wb) return wa - wb
      return (a.placement ?? 99) - (b.placement ?? 99)
    })
    lines.push(`**${div}**`)
    for (const r of group) {
      if (shown >= displayCap) break
      const wt = formatNhscaWeightLabel(r.weight_class)
      const school = r.high_school ? ` (${r.high_school})` : ""
      lines.push(
        `- ${placeSuffix(r.placement)} — ${r.athlete_name}${wt}${school}`,
      )
      shown++
    }
    lines.push("")
    if (shown >= displayCap) break
  }

  if (rows.length > displayCap) {
    lines.push(`*Showing first ${displayCap} of ${rows.length} All-Americans.*`)
  }

  return lines.join("\n").trim()
}

export function formatNchsaaStateTournamentAnswer(
  parsed: ParsedTournamentResultsQuery,
  rows: NchsaaStateResultRow[],
): string {
  const classLabel = parsed.classification ? ` **${parsed.classification}**` : ""
  if (rows.length === 0) {
    if (parsed.classification) {
      return `I don't see **${parsed.classification}** NCHSAA state placers for **${parsed.year}** in our database. Try [/nchsaa/${parsed.year}](/nchsaa/${parsed.year}) for the full bracket.`
    }
    return `I don't see NCHSAA state **placers** for **${parsed.year}** in our database.`
  }

  const maxPlace = parsed.year >= 2026 ? 4 : 8
  const placers = rows.filter((r) => r.place >= 1 && r.place <= maxPlace)
  if (placers.length === 0) {
    const classNote = parsed.classification ? ` ${parsed.classification}` : ""
    return `I found ${rows.length} ${parsed.year}${classNote} NCHSAA rows but no placers (1–${maxPlace}). Qualifier-only data may not be listed here — try /nchsaa/${parsed.year} on the site.`
  }

  const byClass: Record<string, Record<string, NchsaaStateResultRow[]>> = {}
  for (const r of placers) {
    const cls = r.classification || "Unknown"
    const wt = String(r.weight_class ?? "").replace(/\s*lbs?\s*$/i, "").trim()
    if (!byClass[cls]) byClass[cls] = {}
    if (!byClass[cls][wt]) byClass[cls][wt] = []
    byClass[cls][wt].push(r)
  }

  const classOrder = ["1-4A", "1A/2A", "1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A"]
  const sortedClasses = Object.keys(byClass).sort((a, b) => {
    const ia = classOrder.indexOf(a)
    const ib = classOrder.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })

  const genderNote =
    parsed.gender === "women" ? "Women's " : parsed.gender === "men" ? "Men's " : ""
  const lines: string[] = [
    `**${parsed.year}${classLabel} ${genderNote}NCHSAA State Championship placers** (${placers.length} total, top ${maxPlace} per weight):`,
    "",
  ]

  const displayCap = 120
  let shown = 0

  for (const cls of sortedClasses) {
    lines.push(`${cls}`)
    const weights = Object.keys(byClass[cls]).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    for (const wt of weights) {
      const group = byClass[cls][wt].sort((a, b) => a.place - b.place)
      lines.push(`**${wt} lbs**`)
      for (const r of group) {
        if (shown >= displayCap) break
        lines.push(`- ${placeSuffix(r.place)} — ${r.wrestler_name} (${r.school ?? "—"})`)
        shown++
      }
      if (shown >= displayCap) break
    }
    lines.push("")
    if (shown >= displayCap) break
  }

  lines.push(`Browse brackets and full results: [/nchsaa/${parsed.year}](/nchsaa/${parsed.year})`)
  if (placers.length > displayCap) {
    lines.push("")
    lines.push(`*Showing first ${displayCap} of ${placers.length} placers.*`)
  }

  return lines.join("\n").trim()
}

export type FargoResultRow = {
  athlete_name: string
  year: number
  division: string | null
  weight_class: string | null
  wins: number | null
  losses: number | null
  record: string | null
  placement: string | null
  is_all_american: boolean
  high_school: string | null
}

function fargoRecordLabel(row: FargoResultRow): string {
  const rec = (row.record ?? "").trim()
  if (rec) return rec
  const w = row.wins
  const l = row.losses
  if (w != null && l != null && Number.isFinite(w) && Number.isFinite(l)) return `${w}-${l}`
  return "—"
}

export function formatFargoNationalsAnswer(
  parsed: ParsedTournamentResultsQuery,
  rows: FargoResultRow[],
): string {
  if (rows.length === 0) {
    return `I don't see any NC **Fargo Nationals** (US Marine Corps Nationals) results for **${parsed.year}** in our database. Browse [/fargo](/fargo) for recent seasons we have loaded.`
  }

  const byDivision: Record<string, FargoResultRow[]> = {}
  for (const row of rows) {
    const div = (row.division ?? "Unknown").trim() || "Unknown"
    if (!byDivision[div]) byDivision[div] = []
    byDivision[div].push(row)
  }

  const lines: string[] = [
    `Here are **${rows.length}** NC wrestlers from **Fargo Nationals ${parsed.year}** (Freestyle and Greco listed separately when both exist):`,
    "",
  ]

  const divisions = Object.keys(byDivision).sort((a, b) => a.localeCompare(b))
  const displayCap = 150
  let shown = 0

  for (const div of divisions) {
    const group = byDivision[div].sort((a, b) => {
      if (a.is_all_american !== b.is_all_american) return a.is_all_american ? -1 : 1
      const wa = parseInt(String(a.weight_class ?? "999"), 10)
      const wb = parseInt(String(b.weight_class ?? "999"), 10)
      if (wa !== wb) return wa - wb
      return a.athlete_name.localeCompare(b.athlete_name)
    })
    lines.push(`**${div}**`)
    for (const r of group) {
      if (shown >= displayCap) break
      const wt = formatNhscaWeightLabel(r.weight_class)
      const school = r.high_school ? ` (${r.high_school})` : ""
      const rec = fargoRecordLabel(r)
      const place =
        r.placement?.trim() ||
        (r.is_all_american ? "All-American" : "")
      const placePart = place ? ` — ${place}` : ""
      lines.push(`- ${r.athlete_name}${wt}${school}: **${rec}**${placePart}`)
      shown++
    }
    lines.push("")
    if (shown >= displayCap) break
  }

  const fargoHref = parsed.year === 2026 ? "/fargo" : `/fargo/${parsed.year}`
  lines.push(`Browse the archive: [${fargoHref}](${fargoHref})`)
  if (rows.length > displayCap) {
    lines.push("")
    lines.push(`*Showing first ${displayCap} of ${rows.length} wrestlers.*`)
  }

  return lines.join("\n").trim()
}
