import type { SupabaseClient } from "@supabase/supabase-js"

import type { FargoAllAmerican, StatePlacer } from "@/lib/significant-wins"

/**
 * North Carolina state champions and placers (top 8, NCHSAA and NCISA), for recognising a win
 * over one on a profile or in a scouting report.
 *
 * Six seasons back: enough to cover every wrestler a current high-schooler could have met, and no
 * further, so a 2005 champion is never credited to a namesake wrestling today. One entry per name,
 * carrying every school that name placed for (the namesake check needs them) and the best finish.
 */
const YEARS_BACK = 6

type Row = { year: number; place: number; classification: string | null; wrestler_name: string; school: string | null }

/** State placers plus every NC high school seen in those results, for the namesake check. */
export async function loadStatePlacerIndex(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<{ statePlacers: StatePlacer[]; stateSchools: string[]; fargoAllAmericans: FargoAllAmerican[] }> {
  const [statePlacers, fargoAllAmericans] = await Promise.all([
    loadStatePlacers(supabase, now),
    loadFargoAllAmericans(supabase, now).catch(() => []),
  ])
  const stateSchools = [...new Set(statePlacers.flatMap((p) => p.schools))]
  return { statePlacers, stateSchools, fargoAllAmericans }
}

/** Fargo All-Americans over the same window, one entry per name with every school and finish. */
export async function loadFargoAllAmericans(supabase: SupabaseClient, now = new Date()): Promise<FargoAllAmerican[]> {
  const { data, error } = await supabase
    .from("fargo_results")
    .select("year, division, placement, athlete_name, high_school")
    .eq("is_all_american", true)
    .gte("year", now.getFullYear() - YEARS_BACK)
    .limit(5000)
  if (error || !data) return []
  const byName = new Map<string, { name: string; schools: Set<string>; finishes: FargoAllAmerican["finishes"][number][] }>()
  for (const row of data as { year: number; division: string; placement: number | null; athlete_name: string; high_school: string | null }[]) {
    const name = String(row.athlete_name ?? "").trim()
    if (!name) continue
    const key = name.toLowerCase().replace(/\s+/g, " ")
    const entry = byName.get(key) ?? { name, schools: new Set<string>(), finishes: [] }
    if (row.high_school) entry.schools.add(row.high_school)
    entry.finishes.push({ year: row.year, division: row.division, placement: row.placement })
    byName.set(key, entry)
  }
  return [...byName.values()].map((e) => ({ name: e.name, schools: [...e.schools], finishes: e.finishes }))
}

export async function loadStatePlacers(supabase: SupabaseClient, now = new Date()): Promise<StatePlacer[]> {
  const since = now.getFullYear() - YEARS_BACK
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("wrestling_nchsaa_results")
      .select("year, place, classification, wrestler_name, school")
      .gte("year", since)
      .gte("place", 1)
      .lte("place", 8)
      .order("year", { ascending: false })
      .range(from, from + 999)
    if (error || !data?.length) break
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }

  const byName = new Map<string, { name: string; schools: Set<string>; rows: Row[] }>()
  for (const row of rows) {
    const name = String(row.wrestler_name ?? "").trim()
    if (!name) continue
    const key = name.toLowerCase().replace(/\s+/g, " ")
    const entry = byName.get(key) ?? { name, schools: new Set<string>(), rows: [] }
    if (row.school) entry.schools.add(String(row.school))
    entry.rows.push(row)
    byName.set(key, entry)
  }

  return [...byName.values()].map((entry) => ({
    name: entry.name,
    schools: [...entry.schools],
    finishes: entry.rows.map((r) => ({ year: r.year, place: r.place, classification: r.classification })),
  }))
}
