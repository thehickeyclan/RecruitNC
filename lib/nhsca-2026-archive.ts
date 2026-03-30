import nhsca2026 from "@/lib/data/nhsca-2026-replica-page.json"

/** Row shape used by NHSCA archive chart / table / trends. */
export type NhscaArchiveChartYearRow = {
  year: number
  Total: number
  Freshman: number
  Sophomore: number
  Junior: number
  Senior: number
}

/** Matches `Wrestler` on `app/nhsca/archive/page.tsx` — archive search / year lists. */
export type NhscaArchiveWrestlerRow = {
  id: string
  athlete_name: string
  year: number
  weight: string
  placement: number
  division: string
  state: string
  high_school: string
  club: string
}

/** Row shape for legacy athlete search NHSCA block (`weight_class` column name). */
export type Nhsca2026LegacySearchRow = {
  athlete_name: string
  year: number
  placement: number
  weight_class: string
  division: string
  high_school: string | null
}

/** Supabase often returns `weight` as a number; never call string methods without coercing. */
export function normalizeNhscaWeightForDisplay(weight: string | number | null | undefined): string {
  const w = weight == null ? "" : String(weight).trim()
  if (!w) return ""
  return /lbs/i.test(w) ? w : `${w.replace(/\D/g, "") || w}lbs`
}

function section1Row() {
  return nhsca2026.section1_all_americans as {
    athlete_name: string
    year: number
    division: string
    weight: string
    placement: number
    state: string
    high_school: string | null
    club: string | null
  }[]
}

/** Full 2026 NC boy All-Americans from replica JSON (stable ids for React keys). */
export function getNhsca2026CanonicalWrestlers(): NhscaArchiveWrestlerRow[] {
  return section1Row().map((r, i) => {
    const w = normalizeNhscaWeightForDisplay(r.weight)
    const slug = `${r.athlete_name}-${r.division}-${w}`.replace(/\s+/g, "-")
    return {
      id: `nhsca-2026-canonical-${i}-${slug}`,
      athlete_name: r.athlete_name,
      year: r.year,
      weight: w,
      placement: r.placement,
      division: r.division,
      state: r.state || "NC",
      high_school: r.high_school ?? "",
      club: r.club ?? "",
    }
  })
}

function strField(v: unknown): string {
  return v == null ? "" : String(v).trim()
}

function wrestlerRosterMergeKey(w: { athlete_name: string; division: string; weight: string | number | null | undefined }) {
  return `${strField(w.athlete_name).toLowerCase().replace(/\s+/g, " ")}|${strField(w.division)}|${normalizeNhscaWeightForDisplay(w.weight)}`
}

/**
 * 2026 rows: use replica JSON as the roster (names, placements, divisions, weights). Merge in DB `id`,
 * `high_school`, and `club` when the same athlete/weight/division exists in Supabase so search and lists stay
 * complete even if the table is missing rows, while enriched school/club data is kept.
 */
export function mergeNhsca2026WrestlersIntoRows(dbRows: NhscaArchiveWrestlerRow[]): NhscaArchiveWrestlerRow[] {
  const db2026 = dbRows.filter((w) => Number(w.year) === 2026)
  const non2026 = dbRows.filter((w) => Number(w.year) !== 2026)
  const dbByKey = new Map(db2026.map((w) => [wrestlerRosterMergeKey(w), w]))
  const canon = getNhsca2026CanonicalWrestlers().map((c) => {
    const db = dbByKey.get(wrestlerRosterMergeKey(c))
    if (!db) return c
    const dbHs = strField((db as Record<string, unknown>).high_school)
    const dbClub = strField((db as Record<string, unknown>).club)
    const dbId = strField((db as Record<string, unknown>).id)
    return {
      ...c,
      id: dbId || c.id,
      high_school: dbHs || c.high_school,
      club: dbClub || c.club,
    }
  })
  const merged = [...non2026, ...canon]
  const divOrder = ["Freshman", "Sophomore", "Junior", "Senior"]
  return merged.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    const da = divOrder.indexOf(a.division)
    const dbi = divOrder.indexOf(b.division)
    if (da !== dbi) return da - dbi
    const wa = Number.parseInt(a.weight.replace(/lbs/gi, ""), 10) || 0
    const wb = Number.parseInt(b.weight.replace(/lbs/gi, ""), 10) || 0
    if (wa !== wb) return wa - wb
    return a.placement - b.placement
  })
}

export function getNhsca2026ChartRow(): NhscaArchiveChartYearRow {
  const c = nhsca2026.section3_division_counts
  return {
    year: 2026,
    Total: c.total,
    Freshman: c.Freshman,
    Sophomore: c.Sophomore,
    Junior: c.Junior,
    Senior: c.Senior,
  }
}

/** National champions (placement 1) in canonical 2026 roster. */
export function getNhsca2026ChampionCount(): number {
  return section1Row().filter((r) => r.placement === 1).length
}

/** Replace or append 2026 chart point (kept for callers that only have chart arrays). */
export function mergeNhsca2026IntoChartData<T extends NhscaArchiveChartYearRow>(chart: T[]): T[] {
  const row = getNhsca2026ChartRow() as T
  const filtered = chart.filter((d) => d.year !== 2026)
  return [...filtered, row].sort((a, b) => a.year - b.year)
}

/** 2026 NHSCA rows for Legacy Wrestlers search (name filter applied by caller). */
export function getNhsca2026LegacySearchRows(): Nhsca2026LegacySearchRow[] {
  return section1Row().map((r) => ({
    athlete_name: r.athlete_name,
    year: r.year,
    placement: r.placement,
    weight_class: normalizeNhscaWeightForDisplay(r.weight),
    division: r.division,
    high_school: r.high_school,
  }))
}

export type MultiTimeAAEntry = { name: string; times: number; years: string }

export function getNhsca2026CanonicalAthleteNames(): string[] {
  return section1Row().map((r) => r.athlete_name)
}

/**
 * For each 2026 roster name, union NHSCA years from DB history and always include 2026.
 * Returns wrestlers with 2+ distinct AA years (placement 1–8 rows should be pre-filtered in the query).
 */
export function computeMultiTimeAAsFor2026Roster(
  historyRows: { athlete_name: string; year: number }[],
  canonicalNames: string[],
): MultiTimeAAEntry[] {
  const norm = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, " ")
  const yearsByNorm = new Map<string, Set<number>>()

  for (const r of historyRows) {
    const n = norm(r.athlete_name)
    if (!n) continue
    if (!yearsByNorm.has(n)) yearsByNorm.set(n, new Set())
    yearsByNorm.get(n)!.add(r.year)
  }

  const out: MultiTimeAAEntry[] = []
  for (const displayName of canonicalNames) {
    const n = norm(displayName)
    if (!yearsByNorm.has(n)) yearsByNorm.set(n, new Set())
    yearsByNorm.get(n)!.add(2026)

    const yset = yearsByNorm.get(n)!
    if (yset.size < 2) continue
    const sorted = [...yset].sort((a, b) => a - b)
    out.push({ name: displayName, times: sorted.length, years: sorted.join(", ") })
  }
  out.sort((a, b) => b.times - a.times || a.name.localeCompare(b.name))
  return out
}

/** Prefer computed counts when higher; keep manual rows for names DB missed (e.g. spelling). */
/** Stacked state comparison for National Comparison (matches 2025 page shape). */
export type Nhsca2026StateStackRow = {
  rank: number
  state: string
  Freshman: number
  Sophomore: number
  Junior: number
  Senior: number
  total: number
  isNC: boolean
}

function divisionTotalsByState(section: { state: string; total: number }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of section) {
    m.set(r.state, r.total)
  }
  return m
}

/** Join section10–13 with section14 overall order for stacked bar + table. */
export function getNhsca2026StateStackedComparison(): Nhsca2026StateStackRow[] {
  const overall = nhsca2026.section14_overall_aa_state_ranking as { rank: number; state: string; total: number }[]
  const fr = divisionTotalsByState(nhsca2026.section10_freshman_aa_state_ranking as { state: string; total: number }[])
  const so = divisionTotalsByState(nhsca2026.section11_sophomore_aa_state_ranking as { state: string; total: number }[])
  const jr = divisionTotalsByState(nhsca2026.section12_junior_aa_state_ranking as { state: string; total: number }[])
  const sr = divisionTotalsByState(nhsca2026.section13_senior_aa_state_ranking as { state: string; total: number }[])

  return overall.map((row) => ({
    rank: row.rank,
    state: row.state,
    Freshman: fr.get(row.state) ?? 0,
    Sophomore: so.get(row.state) ?? 0,
    Junior: jr.get(row.state) ?? 0,
    Senior: sr.get(row.state) ?? 0,
    total: row.total,
    isNC: row.state === "NC",
  }))
}

export function mergeMultiTimeAALists(computed: MultiTimeAAEntry[], manual: MultiTimeAAEntry[]): MultiTimeAAEntry[] {
  const norm = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, " ")
  const map = new Map<string, MultiTimeAAEntry>()
  for (const m of manual) {
    const k = norm(m.name)
    if (k) map.set(k, m)
  }
  for (const c of computed) {
    const k = norm(c.name)
    if (!k) continue
    const existing = map.get(k)
    if (!existing || c.times > existing.times) map.set(k, c)
  }
  return [...map.values()].sort((a, b) => b.times - a.times || a.name.localeCompare(b.name))
}
