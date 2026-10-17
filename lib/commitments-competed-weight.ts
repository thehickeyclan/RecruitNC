import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { topHonor, type HonorFacts } from "@/lib/commitment-top-honor"

/**
 * The commitments list shows the weight each wrestler last competed at, never the profile's listed
 * weight on its own (a standing rule: a listed weight is whatever was typed once, often seasons
 * ago). No competed weight on file reads as no weight, not as the listed one.
 *
 * And each wrestler's top achievement (lib/commitment-top-honor.ts), read through the same
 * result links the profiles read, so the column cannot credit a namesake's title.
 */
export async function withCompetedWeights<T extends { id: string; weightclass?: unknown; graduationyear?: unknown }>(
  athletes: T[],
): Promise<Array<T & { top_honor: string | null }>> {
  if (!athletes.length) return []
  const admin = createAdminClient()
  const ids = athletes.map((a) => String(a.id))
  const [last, honors] = await Promise.all([
    loadLastCompeted(admin, ids, new Map(athletes.map((a) => [String(a.id), Number(a.graduationyear) || null]))).catch(() => null),
    loadHonorFacts(admin, ids).catch(() => new Map<string, HonorFacts>()),
  ])
  return athletes.map((a) => ({
    ...a,
    weightclass: last ? (last.get(String(a.id))?.weight ?? null) : a.weightclass,
    top_honor: topHonor(honors.get(String(a.id))),
  }))
}

type Admin = ReturnType<typeof createAdminClient>
const TABLES = ["wrestling_nchsaa_results", "nhsca_placements", "super32_results"] as const

async function loadHonorFacts(admin: Admin, ids: string[]): Promise<Map<string, HonorFacts>> {
  const out = new Map<string, HonorFacts>()
  const facts = (id: string) => {
    let f = out.get(id)
    if (!f) out.set(id, (f = { stateTitleYears: [], bestStatePlace: null, stateQualifier: false, allAmericanFinishes: [] }))
    return f
  }
  for (let i = 0; i < ids.length; i += 200) {
    const { data: links } = await admin
      .from("result_athlete_links")
      .select("source_table, source_id, athlete_id")
      .in("athlete_id", ids.slice(i, i + 200))
      .eq("status", "linked")
      .in("source_table", [...TABLES])
    for (const table of TABLES) {
      const mine = (links ?? []).filter((l) => l.source_table === table)
      if (!mine.length) continue
      const owner = new Map(mine.map((l) => [String(l.source_id), String(l.athlete_id)]))
      const placeCol = table === "wrestling_nchsaa_results" ? "place" : "placement"
      for (let j = 0; j < mine.length; j += 200) {
        const { data: rows } = await admin.from(table).select(`id, year, ${placeCol}`).in("id", mine.slice(j, j + 200).map((l) => l.source_id))
        for (const row of (rows ?? []) as Array<Record<string, unknown>>) {
          const id = owner.get(String(row.id))
          if (!id) continue
          const f = facts(id)
          const place = Number(row[placeCol])
          const year = Number(row.year)
          if (table === "wrestling_nchsaa_results") {
            f.stateQualifier = true
            if (Number.isFinite(place) && place >= 1) {
              f.bestStatePlace = f.bestStatePlace == null ? place : Math.min(f.bestStatePlace, place)
              if (place === 1 && Number.isFinite(year)) f.stateTitleYears.push(year)
            }
          } else if (Number.isFinite(place) && place >= 1 && place <= 8) {
            f.allAmericanFinishes.push(`${table}|${year}`)
          }
        }
      }
    }
  }
  return out
}
