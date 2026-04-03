/**
 * Parses NHSCA roster exports (TSV or CSV, header row) into nhsca_placements rows.
 * Delimiter: auto-detect, or force tab vs comma. CSV supports quoted fields ("...").
 * Mirrors scripts/tsv-roster-to-nhsca-placements-sql.mjs column mapping.
 *
 * `id` column → nhsca_roster_id (UUID), not athlete identity.
 * Official placement: integers 1–8 only; other values become null (not seed/bracket position).
 */

export type NhscaRosterTsvDeleteMode = "division" | "source"

export type ParsedNhscaRosterRow = {
  year: number
  athlete_name: string
  high_school: string | null
  placement: number | null
  weight_class: string
  division: string
  record: string | null
  state: string
  match_status: string
  source: string
  gender?: string | null
  wins?: number | null
  losses?: number | null
  seed?: number | null
  bracket_status?: string | null
  bracket_side?: string | null
  current_round?: string | null
  seeded_wins?: number | null
  seeded_losses?: number | null
  furthest_consi_round?: string | null
  notable_wins?: string | null
  notable_win_count?: number | null
  nhsca_roster_id?: string | null
}

export type ParseNhscaRosterTsvResult = {
  rows: ParsedNhscaRosterRow[]
  skippedEmptyName: number
  warnings: string[]
  divisions: string[]
}

const HEADER_NAMES = [
  "id",
  "name",
  "weight_class",
  "gender",
  "classification",
  "school",
  "wins",
  "losses",
  "seed",
  "placement",
  "bracket_status",
  "notable_wins",
  "notable_win_count",
  "bracket_side",
  "current_round",
  "seeded_wins",
  "seeded_losses",
  "furthest_consi_round",
] as const

function idx(header: string[], name: string): number {
  return header.indexOf(name)
}

/** RFC 4180–style: commas split fields; double quotes wrap fields; "" inside quotes = one ". */
export function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let i = 0
  let inQuotes = false
  while (i < line.length) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cur += c
      i++
    } else {
      if (c === '"') {
        inQuotes = true
        i++
        continue
      }
      if (c === ",") {
        out.push(cur)
        cur = ""
        i++
        continue
      }
      cur += c
      i++
    }
  }
  out.push(cur)
  return out
}

function splitRosterLine(line: string, delimiter: "tab" | "comma"): string[] {
  if (delimiter === "tab") return line.split("\t")
  return parseCsvLine(line)
}

/** Auto: prefer TSV when the header line has tabs and splits into at least as many fields as CSV. */
export function resolveRosterDelimiter(firstLine: string, mode: NhscaRosterDelimiterMode): "tab" | "comma" {
  if (mode === "tab") return "tab"
  if (mode === "comma") return "comma"
  const tabParts = firstLine.split("\t").length
  const csvParts = parseCsvLine(firstLine).length
  if (firstLine.includes("\t") && tabParts >= csvParts) return "tab"
  if (csvParts > 1) return "comma"
  if (tabParts > 1) return "tab"
  return "comma"
}

/** Lowercase, trim; tolerate UTF-8 BOM on first cell (Excel / some exports). */
function normalizeHeaderCells(cells: string[]): string[] {
  return cells.map((h, idx) => {
    let t = h.trim()
    if (idx === 0) t = t.replace(/^\uFEFF/, "")
    return t.toLowerCase()
  })
}

function resolveClassificationIndex(header: string[]): number {
  const a = idx(header, "classification")
  if (a >= 0) return a
  return idx(header, "division")
}

function trimCell(s: string): string {
  return String(s ?? "").trim()
}

function parseIntOrNull(s: string): number | null {
  const t = trimCell(s)
  if (t === "") return null
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? n : null
}

/** Official NHSCA placement 1–8; anything else is not stored as placement. */
function parseOfficialPlacement(raw: string): { placement: number | null; warning?: string } {
  const t = trimCell(raw)
  if (t === "" || t.toLowerCase() === "null") return { placement: null }
  if (!/^\d+$/.test(t)) {
    return { placement: null, warning: `non-numeric placement "${t}" treated as null` }
  }
  const n = parseInt(t, 10)
  if (n >= 1 && n <= 8) return { placement: n }
  return { placement: null, warning: `placement ${n} is not 1–8; stored as null` }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim())
}

/**
 * @param raw - Full text including header (tab- or comma-separated)
 * @param year - Tournament year (e.g. 2026)
 * @param state - Usually NC
 * @param source - Stored on each row (e.g. admin_roster_tsv_2026)
 * @param options.delimiter - default auto (detect from first line)
 */
export function parseNhscaRosterTsv(
  raw: string,
  year: number,
  state: string,
  source: string,
  options?: { delimiter?: NhscaRosterDelimiterMode },
): ParseNhscaRosterTsvResult {
  const mode = options?.delimiter ?? "auto"
  const bomStripped = raw.replace(/^\uFEFF/, "")
  const lines = bomStripped.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    const delimiterFallback =
      lines.length === 1 ? resolveRosterDelimiter(lines[0], mode) : ("tab" as const)
    return {
      rows: [],
      skippedEmptyName: 0,
      warnings: ["Need a header row and at least one data row"],
      divisions: [],
      delimiter: delimiterFallback,
    }
  }

  const delimiter = resolveRosterDelimiter(lines[0], mode)
  const header = normalizeHeaderCells(splitRosterLine(lines[0], delimiter))
  const classIdx = resolveClassificationIndex(header)
  const I: Record<(typeof HEADER_NAMES)[number], number> = {
    id: idx(header, "id"),
    name: idx(header, "name"),
    weight_class: idx(header, "weight_class"),
    gender: idx(header, "gender"),
    classification: classIdx,
    school: idx(header, "school"),
    wins: idx(header, "wins"),
    losses: idx(header, "losses"),
    seed: idx(header, "seed"),
    placement: idx(header, "placement"),
    bracket_status: idx(header, "bracket_status"),
    notable_wins: idx(header, "notable_wins"),
    notable_win_count: idx(header, "notable_win_count"),
    bracket_side: idx(header, "bracket_side"),
    current_round: idx(header, "current_round"),
    seeded_wins: idx(header, "seeded_wins"),
    seeded_losses: idx(header, "seeded_losses"),
    furthest_consi_round: idx(header, "furthest_consi_round"),
  }

  if (I.name < 0 || I.weight_class < 0 || I.classification < 0) {
    return {
      rows: [],
      skippedEmptyName: 0,
      warnings: [
        'Missing required columns: need header row with "name", "weight_class", and "classification" (or "division")',
      ],
      divisions: [],
      delimiter,
    }
  }

  const rows: ParsedNhscaRosterRow[] = []
  const warnings: string[] = []
  let skippedEmptyName = 0
  const divisionSet = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const parts = splitRosterLine(lines[i], delimiter)
    const get = (j: number) => (j >= 0 && j < parts.length ? parts[j] : "")

    const name = trimCell(get(I.name))
    if (!name) {
      skippedEmptyName++
      continue
    }

    const w = parseInt(get(I.wins), 10)
    const l = parseInt(get(I.losses), 10)
    const wins = Number.isFinite(w) ? w : 0
    const losses = Number.isFinite(l) ? l : 0
    const record = `${wins}-${losses}`

    const { placement, warning: plWarn } = parseOfficialPlacement(get(I.placement))
    if (plWarn) warnings.push(`Row ${i + 1} (${name}): ${plWarn}`)

    const schoolRaw = trimCell(get(I.school))
    const high_school = schoolRaw === "" ? null : schoolRaw

    const division = trimCell(get(I.classification))
    if (!division) {
      warnings.push(`Row ${i + 1} (${name}): missing classification — skipped`)
      continue
    }
    divisionSet.add(division)

    const wc = trimCell(get(I.weight_class))
    if (!wc) {
      warnings.push(`Row ${i + 1} (${name}): missing weight_class — skipped`)
      continue
    }

    let nhsca_roster_id: string | null = null
    if (I.id >= 0) {
      const rid = trimCell(get(I.id))
      if (rid && isUuid(rid)) nhsca_roster_id = rid
    }

    const row: ParsedNhscaRosterRow = {
      year,
      athlete_name: name,
      high_school,
      placement,
      weight_class: wc,
      division,
      record,
      state: state.trim() || "NC",
      match_status: "unmatched",
      source,
    }

    const g = trimCell(get(I.gender))
    if (g) row.gender = g

    const winsN = parseIntOrNull(get(I.wins))
    const lossesN = parseIntOrNull(get(I.losses))
    if (winsN !== null) row.wins = winsN
    if (lossesN !== null) row.losses = lossesN

    const seedN = parseIntOrNull(get(I.seed))
    if (seedN !== null) row.seed = seedN

    const bs = trimCell(get(I.bracket_status))
    if (bs) row.bracket_status = bs
    const bside = trimCell(get(I.bracket_side))
    if (bside) row.bracket_side = bside
    const cr = trimCell(get(I.current_round))
    if (cr) row.current_round = cr
    const sw = parseIntOrNull(get(I.seeded_wins))
    if (sw !== null) row.seeded_wins = sw
    const sl = parseIntOrNull(get(I.seeded_losses))
    if (sl !== null) row.seeded_losses = sl
    const fr = trimCell(get(I.furthest_consi_round))
    if (fr) row.furthest_consi_round = fr
    const nw = trimCell(get(I.notable_wins))
    if (nw) row.notable_wins = nw
    const nwc = parseIntOrNull(get(I.notable_win_count))
    if (nwc !== null) row.notable_win_count = nwc

    if (nhsca_roster_id) row.nhsca_roster_id = nhsca_roster_id

    rows.push(row)
  }

  const divisions = [...divisionSet].sort()

  return { rows, skippedEmptyName, warnings, divisions, delimiter }
}

const BASE_KEYS: (keyof ParsedNhscaRosterRow)[] = [
  "year",
  "athlete_name",
  "high_school",
  "placement",
  "weight_class",
  "division",
  "record",
  "state",
  "match_status",
  "source",
]

const EXTENDED_KEYS: (keyof ParsedNhscaRosterRow)[] = [
  "gender",
  "wins",
  "losses",
  "seed",
  "bracket_status",
  "bracket_side",
  "current_round",
  "seeded_wins",
  "seeded_losses",
  "furthest_consi_round",
  "notable_wins",
  "notable_win_count",
  "nhsca_roster_id",
]

/** Strip extended fields for DBs without migration 001 roster columns. */
export function nhscaRosterRowToMinimalInsert(row: ParsedNhscaRosterRow): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (const k of BASE_KEYS) {
    o[k] = row[k]
  }
  return o
}

export function nhscaRosterRowHasExtended(row: ParsedNhscaRosterRow): boolean {
  return EXTENDED_KEYS.some((k) => row[k] !== undefined && row[k] !== null)
}

export function nhscaRosterRowToFullInsert(row: ParsedNhscaRosterRow): Record<string, unknown> {
  const o = nhscaRosterRowToMinimalInsert(row)
  for (const k of EXTENDED_KEYS) {
    const v = row[k]
    if (v !== undefined && v !== null) o[k] = v
  }
  return o
}
