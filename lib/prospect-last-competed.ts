import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * The last event each wrestler actually competed at, in bulk, for the directory.
 *
 * The profile derives this through `resolveLastCompetedWeight`, which needs a whole loaded
 * profile per athlete. Two hundred and sixty of those to draw one table column is not a trade
 * worth making, so this reads the result tables directly and keeps only what a column needs:
 * the event's name and when it happened.
 *
 * Dates are the problem these tables set. `other_tournament_results` carries a real
 * `event_date`; the national and state tables carry a year and nothing finer. A year alone
 * cannot be compared against a date without inventing a day, so each yearly source is dated to
 * the month that event is actually held - states in February, Super 32 in October, Fargo in
 * July, NHSCA in March. That is a real approximation and it exists to order a list, never to
 * be printed as a date.
 */

export type LastCompeted = {
  /** What to print: "Super 32", "NCHSAA State Championships". */
  event: string
  /** Sortable, and the year is what gets shown beside the name. */
  date: string
  year: number
}

/** Month each yearly event is held, so a year can be ordered against a dated result. */
const SOURCES: Array<{
  table: string
  label: string
  month: string
  yearColumn: string
}> = [
  { table: "wrestling_nchsaa_results", label: "NCHSAA State Championships", month: "02-20", yearColumn: "year" },
  { table: "nhsca_placements", label: "NHSCA Nationals", month: "03-27", yearColumn: "year" },
  { table: "super32_results", label: "Super 32", month: "10-19", yearColumn: "year" },
  { table: "fargo_results", label: "Fargo", month: "07-18", yearColumn: "year" },
]

function chunk<T>(items: T[], size = 200): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function loadLastCompeted(
  supabase: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, LastCompeted>> {
  const best = new Map<string, LastCompeted>()
  const ids = [...new Set(athleteIds.filter(Boolean))]
  if (ids.length === 0) return best

  const keep = (athleteId: string, next: LastCompeted) => {
    const current = best.get(athleteId)
    if (!current || next.date > current.date) best.set(athleteId, next)
  }

  /* The dated table first: its events are the recent ones and its dates are real. */
  for (const part of chunk(ids)) {
    const { data, error } = await supabase
      .from("other_tournament_results")
      .select("athlete_id, event_short_name, event_name, event_date, year")
      .in("athlete_id", part)
      .not("event_date", "is", null)
    if (error) break
    for (const row of data ?? []) {
      const r = row as unknown as Record<string, unknown>
      const athleteId = String(r.athlete_id ?? "")
      const date = String(r.event_date ?? "")
      if (!athleteId || !date) continue
      keep(athleteId, {
        event: String(r.event_short_name ?? r.event_name ?? "Tournament"),
        date,
        year: Number(r.year) || Number(date.slice(0, 4)),
      })
    }
  }

  for (const source of SOURCES) {
    for (const part of chunk(ids)) {
      const { data, error } = await supabase
        .from(source.table)
        .select(`athlete_id, ${source.yearColumn}`)
        .in("athlete_id", part)
      if (error) break
      for (const row of data ?? []) {
        const r = row as unknown as Record<string, unknown>
        const athleteId = String(r.athlete_id ?? "")
        const year = Number(r[source.yearColumn])
        if (!athleteId || !Number.isFinite(year)) continue
        keep(athleteId, { event: source.label, date: `${year}-${source.month}`, year })
      }
    }
  }

  return best
}

/** "Super 32 · 2025", or null when nothing is on file. */
export function lastCompetedLabel(entry: LastCompeted | null | undefined): string | null {
  if (!entry?.event) return null
  return entry.year ? `${entry.event} · ${entry.year}` : entry.event
}
