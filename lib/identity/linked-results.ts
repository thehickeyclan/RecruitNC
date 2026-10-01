/**
 * A wrestler's tournament rows read by stored link instead of by name (wrestler identity, step 2).
 *
 * One query for his links and one per source table, in place of the dozens of name searches each
 * profile view ran. The rows go through the same year windows, mapping, dedupe and profile-JSON
 * merges the name path uses - only how they are found changes.
 *
 * Off unless RESULT_LINKS_READ=1. Any failure returns null and the caller falls back to name
 * matching, so a missing table or a bad query can never empty a profile.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export const LINKED_TABLES = [
  "wrestling_nchsaa_results",
  "nhsca_placements",
  "wrestling_nhsca_results",
  "super32_results",
  "fargo_results",
  "nhsca_roster",
] as const

export type LinkedTable = (typeof LINKED_TABLES)[number]
export type LinkedSourceRows = Record<LinkedTable, Record<string, unknown>[]>

export function resultLinksEnabled(): boolean {
  return process.env.RESULT_LINKS_READ === "1"
}

export async function loadLinkedSourceRows(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<LinkedSourceRows | null> {
  if (!athleteId) return null
  try {
    const { data: links, error } = await supabase
      .from("result_athlete_links")
      .select("source_table,source_id")
      .eq("athlete_id", athleteId)
      .eq("status", "linked")
      .in("source_table", [...LINKED_TABLES])
    if (error) return null

    const out = Object.fromEntries(LINKED_TABLES.map((t) => [t, [] as Record<string, unknown>[]])) as LinkedSourceRows
    const byTable = new Map<LinkedTable, string[]>()
    for (const l of links ?? []) {
      const t = l.source_table as LinkedTable
      byTable.set(t, [...(byTable.get(t) ?? []), String(l.source_id)])
    }
    const fetched = await Promise.all(
      [...byTable].map(async ([table, ids]) => {
        const { data, error: e } = await supabase.from(table).select("*").in("id", ids)
        return { table, rows: (data ?? []) as Record<string, unknown>[], failed: Boolean(e) }
      }),
    )
    if (fetched.some((f) => f.failed)) return null
    for (const f of fetched) out[f.table] = f.rows
    return out
  } catch {
    return null
  }
}

/** Rows whose tournament year falls in [min, max], the window each name query applied. */
export function inYearWindow<T extends Record<string, unknown>>(rows: T[], min: number | null, max: number | null): T[] {
  return rows.filter((r) => {
    const y = Number(r.year)
    if (!Number.isFinite(y)) return false
    return (min == null || y >= min) && (max == null || y <= max)
  })
}
