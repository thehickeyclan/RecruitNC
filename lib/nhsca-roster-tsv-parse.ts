/**
 * Parses NHSCA roster TSV exports (header row, tab-separated) into nhsca_placements rows.
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
 * @param raw - Full TSV text including header
 * @param year - Tournament year (e.g. 2026)
 * @param state - Usually NC
 * @param source - Stored on each row (e.g. admin_roster_tsv_2026)
 */
export function parseNhscaRosterTsv(
  raw: string,
  year: number,
  state: string,
  source: string,
): ParseNhscaRosterTsvResult {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    return {
      rows: [],
      skippedEmptyName: 0,
      warnings: ["Need a header row and at least one data row"],
      divisions: [],
    }
  }

  const header = lines[0].split("\t").map((h) => h.trim())
  const I: Record<(typeof HEADER_NAMES)[number], number> = {
    id: idx(header, "id"),
    name: idx(header, "name"),
    weight_class: idx(header, "weight_class"),
    gender: idx(header, "gender"),
    classification: idx(header, "classification"),
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
        'Missing required columns: need header row with "name", "weight_class", and "classification"',
      ],
      divisions: [],
    }
  }

  const rows: ParsedNhscaRosterRow[] = []
  const warnings: string[] = []
  let skippedEmptyName = 0
  const divisionSet = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("\t")
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

  return { rows, skippedEmptyName, warnings, divisions }
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
