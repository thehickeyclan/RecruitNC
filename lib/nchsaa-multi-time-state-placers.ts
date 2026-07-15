import { getSupabaseAdmin } from "@/lib/server-supabase"
import {
  NCHSAA_FOUR_TIME_STATE_CHAMPIONS,
  type NchsaaMultiTimeStateChampion,
} from "@/lib/nchsaa-four-time-state-champions-data"
import {
  NCHSAA_FOUR_TIME_STATE_PLACERS_SEED,
  normalizePlacerNameKey,
  sortMultiTimePlacersChronological,
  type NchsaaMultiTimeStatePlacer,
} from "@/lib/nchsaa-four-time-state-placers-data"

export type { NchsaaMultiTimeStatePlacer } from "@/lib/nchsaa-four-time-state-placers-data"
export {
  NCHSAA_FOUR_TIME_STATE_PLACERS_SEED,
  sortMultiTimePlacersChronological,
  normalizePlacerNameKey,
} from "@/lib/nchsaa-four-time-state-placers-data"

function championToPlacer(c: NchsaaMultiTimeStateChampion): NchsaaMultiTimeStatePlacer {
  const placements = c.championships.map((ch) => ({
    year: ch.year,
    place: 1 as const,
    classification: ch.classification,
    weight_class: ch.weight_class,
    school: ch.school,
  }))
  return {
    wrestler_name: c.wrestler_name,
    placement_count: placements.length,
    placements,
    schools: [...c.schools],
    championships: placements.length,
  }
}

/**
 * Curated four-time placers: seed archive list, plus any 4× champions not already present
 * (every 4× champ is at least a 4× placer).
 */
export function getCuratedFourTimeStatePlacers(): NchsaaMultiTimeStatePlacer[] {
  const byKey = new Map<string, NchsaaMultiTimeStatePlacer>()
  for (const row of NCHSAA_FOUR_TIME_STATE_PLACERS_SEED) {
    byKey.set(normalizePlacerNameKey(row.wrestler_name), row)
  }
  for (const champ of NCHSAA_FOUR_TIME_STATE_CHAMPIONS) {
    const key = normalizePlacerNameKey(champ.wrestler_name)
    if (byKey.has(key)) continue
    // Also skip Cam ↔ Cameron Stinson style aliases already in seed
    const alt =
      key.startsWith("CAMERON ")
        ? key.replace(/^CAMERON /, "CAM ")
        : key.startsWith("CAM ")
          ? key.replace(/^CAM /, "CAMERON ")
          : null
    if (alt && byKey.has(alt)) continue
    byKey.set(key, championToPlacer(champ))
  }
  return sortMultiTimePlacersChronological([...byKey.values()])
}

export const NCHSAA_FOUR_TIME_STATE_PLACERS = getCuratedFourTimeStatePlacers()

function normalizeWrestlerKey(s: string): string {
  return normalizePlacerNameKey(s)
}

/**
 * Wrestlers with exactly `exactCount` NCHSAA state places (place 1–6).
 * Four-time list is curated (`getCuratedFourTimeStatePlacers`).
 */
export async function getNchsaaStatePlacersByExactPlacementCount(
  exactCount: 2 | 3 | 4,
): Promise<NchsaaMultiTimeStatePlacer[]> {
  if (exactCount === 4) {
    return getCuratedFourTimeStatePlacers()
  }

  const adminClient = getSupabaseAdmin()
  const { data: allPlacers, error } = await adminClient
    .from("wrestling_nchsaa_results")
    .select("wrestler_name, year, classification, weight_class, school, place")
    .gte("place", 1)
    .lte("place", 6)
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
  for (const row of allPlacers ?? []) {
    const norm = normalizeWrestlerKey(String((row as { wrestler_name?: string }).wrestler_name ?? ""))
    if (!norm) continue
    if (!groups[norm]) groups[norm] = []
    groups[norm].push(row as Record<string, unknown>)
  }

  const filtered: NchsaaMultiTimeStatePlacer[] = []
  for (const rows of Object.values(groups)) {
    // One place per tournament year (keep best place if duplicates)
    const byYear = new Map<number, Record<string, unknown>>()
    for (const row of rows) {
      const y = Number(row.year ?? 0)
      if (!y) continue
      const prev = byYear.get(y)
      const place = Number(row.place ?? 99)
      if (!prev || place < Number(prev.place ?? 99)) byYear.set(y, row)
    }
    if (byYear.size !== exactCount) continue
    const sorted = [...byYear.values()].sort((a, b) => Number(a.year ?? 0) - Number(b.year ?? 0))
    const first = sorted[0]
    const placements = sorted.map((row) => ({
      year: Number(row.year ?? 0),
      place: Number(row.place ?? 0),
      classification: String(row.classification ?? ""),
      weight_class: String(row.weight_class ?? ""),
      school: String(row.school ?? ""),
    }))
    filtered.push({
      wrestler_name: String(first.wrestler_name ?? "").trim(),
      placement_count: placements.length,
      placements,
      schools: [...new Set(placements.map((p) => p.school).filter(Boolean))],
      championships: placements.filter((p) => p.place === 1).length,
    })
  }

  return sortMultiTimePlacersChronological(filtered)
}
