import { getSupabaseAdmin } from "@/lib/server-supabase"
import type {
  NchsaaStateResultRow,
  NhscaAllAmericanRow,
  ParsedTournamentResultsQuery,
} from "@/lib/data-dawg-tournament-results-query"

const MAX_NCHSAA_ROWS = 5000

async function fetchAllNchsaaForYear(year: number): Promise<NchsaaStateResultRow[]> {
  const admin = getSupabaseAdmin()
  const batchSize = 1000
  let offset = 0
  const all: NchsaaStateResultRow[] = []

  for (;;) {
    const { data, error } = await admin
      .from("wrestling_nchsaa_results")
      .select("wrestler_name,place,year,classification,weight_class,school")
      .eq("year", year)
      .order("classification")
      .order("weight_class")
      .order("place")
      .range(offset, offset + batchSize - 1)
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as NchsaaStateResultRow[]
    all.push(...batch)
    if (batch.length < batchSize || all.length >= MAX_NCHSAA_ROWS) break
    offset += batchSize
  }

  return all
}

function applyNhscaGenderFilter<T extends { division?: string | null }>(
  rows: T[],
  gender: ParsedTournamentResultsQuery["gender"],
): T[] {
  if (gender === "women") {
    return rows.filter((r) => {
      const d = (r.division ?? "").toLowerCase()
      return d.includes("girl") || d.includes("women") || d.includes("female")
    })
  }
  return rows.filter((r) => {
    const d = (r.division ?? "").toLowerCase()
    return !d.includes("girl") && !d.includes("women") && !d.includes("female")
  })
}

export async function fetchNhscaAllAmericansByYear(
  parsed: ParsedTournamentResultsQuery,
): Promise<NhscaAllAmericanRow[]> {
  const admin = getSupabaseAdmin()
  const year = parsed.year
  const plcSel = "athlete_name,placement,year,division,weight_class,high_school"
  const legSel = "athlete_name,placement,year,division,weight,high_school"

  const [plc, leg] = await Promise.all([
    admin
      .from("nhsca_placements")
      .select(plcSel)
      .eq("year", year)
      .gte("placement", 1)
      .lte("placement", 8)
      .not("athlete_name", "is", null)
      .neq("athlete_name", "")
      .limit(2000),
    admin
      .from("wrestling_nhsca_results")
      .select(legSel)
      .eq("year", year)
      .gte("placement", 1)
      .lte("placement", 8)
      .not("athlete_name", "is", null)
      .neq("athlete_name", "")
      .limit(2000),
  ])

  if (plc.error && leg.error) throw new Error(plc.error.message || leg.error.message)

  const normalize = (row: Record<string, unknown>): NhscaAllAmericanRow => ({
    athlete_name: String(row.athlete_name ?? "").trim(),
    placement: Number(row.placement) || 0,
    year: Number(row.year) || year,
    division: row.division != null ? String(row.division) : null,
    weight_class: String(row.weight_class ?? row.weight ?? "").trim() || null,
    high_school: row.high_school != null ? String(row.high_school) : null,
  })

  const key = (r: NhscaAllAmericanRow) =>
    `${r.athlete_name}|${r.placement}|${r.weight_class}|${r.high_school}|${r.division}`
  const seen = new Set<string>()
  const merged: NhscaAllAmericanRow[] = []

  for (const row of [...(plc.data ?? []), ...(leg.data ?? [])]) {
    const r = normalize(row as Record<string, unknown>)
    if (!r.athlete_name || r.placement < 1) continue
    const k = key(r)
    if (seen.has(k)) continue
    seen.add(k)
    merged.push(r)
  }

  return applyNhscaGenderFilter(merged, parsed.gender).sort((a, b) => {
    const da = (a.division ?? "").localeCompare(b.division ?? "")
    if (da !== 0) return da
    const wa = parseInt(String(a.weight_class ?? "999"), 10)
    const wb = parseInt(String(b.weight_class ?? "999"), 10)
    if (wa !== wb) return wa - wb
    return a.placement - b.placement
  })
}

export async function fetchNchsaaStateTournamentByYear(
  parsed: ParsedTournamentResultsQuery,
): Promise<NchsaaStateResultRow[]> {
  const rows = await fetchAllNchsaaForYear(parsed.year)

  return rows
    .filter((r) => r.place >= 1)
    .sort((a, b) => {
      const ca = a.classification.localeCompare(b.classification)
      if (ca !== 0) return ca
      const wa = parseInt(String(a.weight_class), 10) - parseInt(String(b.weight_class), 10)
      if (wa !== 0) return wa
      return a.place - b.place
    })
}

export async function answerTournamentResultsQuery(
  parsed: ParsedTournamentResultsQuery,
): Promise<{ answer: string; rowCount: number }> {
  const {
    formatNhscaAllAmericansAnswer,
    formatNchsaaStateTournamentAnswer,
  } = await import("@/lib/data-dawg-tournament-results-query")

  if (parsed.kind === "nhsca_all_americans") {
    const rows = await fetchNhscaAllAmericansByYear(parsed)
    return {
      answer: formatNhscaAllAmericansAnswer(parsed, rows),
      rowCount: rows.length,
    }
  }

  const rows = await fetchNchsaaStateTournamentByYear(parsed)
  return {
    answer: formatNchsaaStateTournamentAnswer(parsed, rows),
    rowCount: rows.length,
  }
}
