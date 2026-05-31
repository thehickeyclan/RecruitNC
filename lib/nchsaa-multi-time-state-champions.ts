import { getSupabaseAdmin } from "@/lib/server-supabase"
import {
  NCHSAA_FOUR_TIME_STATE_CHAMPIONS,
  type NchsaaMultiTimeStateChampion,
} from "@/lib/nchsaa-four-time-state-champions-data"

export type { NchsaaMultiTimeStateChampion } from "@/lib/nchsaa-four-time-state-champions-data"
export { NCHSAA_FOUR_TIME_STATE_CHAMPIONS } from "@/lib/nchsaa-four-time-state-champions-data"

function normalizeWrestlerKey(s: string): string {
  return s?.trim().replace(/\s+/g, " ").toUpperCase() || ""
}

/**
 * Wrestlers with exactly `exactCount` NCHSAA individual titles (place = 1), from `wrestling_nchsaa_results`.
 * Four-time list is curated (`NCHSAA_FOUR_TIME_STATE_CHAMPIONS`) for parity with the archive.
 */
export async function getNchsaaStateChampionsByExactTitleCount(
  exactCount: 2 | 3 | 4,
): Promise<NchsaaMultiTimeStateChampion[]> {
  if (exactCount === 4) {
    return NCHSAA_FOUR_TIME_STATE_CHAMPIONS.map((r) => ({
      ...r,
      championships: r.championships.map((c) => ({ ...c })),
      schools: [...r.schools],
      classifications: [...r.classifications],
      weight_classes: [...r.weight_classes],
    }))
  }

  const adminClient = getSupabaseAdmin()
  const { data: allChampions, error } = await adminClient
    .from("wrestling_nchsaa_results")
    .select("wrestler_name, year, classification, weight_class, school, place")
    .eq("place", 1)
    .not("school", "is", null)
    .neq("school", "")
    .not("school", "ilike", "unknown")
    .not("wrestler_name", "is", null)
    .neq("wrestler_name", "")
    .limit(100000)

  if (error) {
    throw error
  }

  const groups: Record<string, Record<string, unknown>[]> = {}
  for (const c of allChampions ?? []) {
    const norm = normalizeWrestlerKey(String((c as { wrestler_name?: string }).wrestler_name ?? ""))
    if (!norm) continue
    if (!groups[norm]) groups[norm] = []
    groups[norm].push(c as Record<string, unknown>)
  }

  const filtered: NchsaaMultiTimeStateChampion[] = []
  for (const champs of Object.values(groups)) {
    if (champs.length !== exactCount) continue
    const sortedChamps = [...champs].sort(
      (a, b) => Number(a.year ?? 0) - Number(b.year ?? 0),
    )
    const first = sortedChamps[0]
    filtered.push({
      wrestler_name: String(first.wrestler_name ?? "").trim(),
      championship_count: champs.length,
      championships: sortedChamps.map((row) => ({
        year: Number(row.year ?? 0),
        classification: String(row.classification ?? ""),
        weight_class: String(row.weight_class ?? ""),
        school: String(row.school ?? ""),
      })),
      schools: [...new Set(sortedChamps.map((c) => String(c.school ?? "")))],
      classifications: [...new Set(sortedChamps.map((c) => String(c.classification ?? "")))],
      weight_classes: [...new Set(sortedChamps.map((c) => String(c.weight_class ?? "")))],
    })
  }

  filtered.sort((a, b) => a.wrestler_name.localeCompare(b.wrestler_name, undefined, { sensitivity: "base" }))
  return filtered
}
