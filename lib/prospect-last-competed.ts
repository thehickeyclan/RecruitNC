import type { SupabaseClient } from "@supabase/supabase-js"
import { highSchoolStart } from "@/lib/high-school-window"

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
 *
 * Duals and in-season events count too (Matt, 7 October 2026). A wrestler whose last outing was
 * the Ultimate Club Duals or a Tuesday dual read as last competing at States in February, because
 * only the results tables were read. Two dated sources close that:
 *
 * - `other_tournament_bouts`, which holds every dual we import (UCD, NHSCA National Duals, AAU,
 *   Junior and 16U Duals, I-64, the TOC) plus Fargo, Journeymen and the national tournaments,
 *   each with the day it was wrestled.
 * - `matches`, the in-season record: duals, invitationals and the state series, dated per bout.
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

/** "2/21/2026" or "2026-02-21T..." as "2026-02-21"; null when it is not a usable date. */
export function isoDay(raw: unknown): string | null {
  const value = String(raw ?? "").trim()
  if (!value) return null
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) return `${us[3]}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}`
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null
}

/**
 * "2026 NHSCA National Duals" -> "NHSCA National Duals";
 * "2026 Fargo Junior Freestyle" stays as it is past the year; "2026 Tar Heel State Classic - 16U
 * Boys Freestyle" -> "Tar Heel State Classic". The column names the event, not the bracket.
 */
export function boutEventLabel(eventName: unknown): string {
  const name = String(eventName ?? "").trim()
  return name.replace(/^\d{4}\s+/, "").split(/\s+[-\u2014]\s+/)[0]!.trim() || "Tournament"
}

/** Every row of a query, past PostgREST's 1,000-row page. */
async function allRows(
  query: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999)
    if (error || !data?.length) break
    out.push(...(data as Array<Record<string, unknown>>))
    if (data.length < 1000) break
  }
  return out
}

function chunk<T>(items: T[], size = 200): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * One name per event, whichever table it came from. The results tables, the bout table and a
 * coach's season entry each spell the same tournament their own way - "NHSCA High School
 * Nationals", "NHSCA Nationals"; "Fargo Junior Women's Freestyle", "Fargo" - and the column
 * should not read as two events.
 */
const CANONICAL: Array<[RegExp, string]> = [
  [/junior national duals/i, "Junior National Duals"],
  [/16u national duals/i, "16U National Duals"],
  [/nhsca.*duals/i, "NHSCA National Duals"],
  [/nhsca/i, "NHSCA Nationals"],
  [/early entry/i, "Super 32 Early Entry"],
  [/super 32/i, "Super 32"],
  [/fargo/i, "Fargo"],
  [/journeymen women/i, "Journeymen Women's World Classic"],
  [/journeymen/i, "Journeymen Fall Classic"],
  [/i-64|interstate 64/i, "I-64 Duals"],
  [/aau scholastic/i, "AAU Scholastic Duals"],
  [/ultimate club/i, "Ultimate Club Duals"],
  [/tournament of champions/i, "Tournament of Champions"],
]

export function canonicalEventLabel(raw: unknown): string {
  const name = String(raw ?? "")
    .replace(/`/g, "'")
    .replace(/^\d{4}\s+/, "")
    .trim()
  return CANONICAL.find(([re]) => re.test(name))?.[1] ?? (name || "Tournament")
}

type Candidate = { athleteId: string; entry: LastCompeted }

export async function loadLastCompeted(
  supabase: SupabaseClient,
  athleteIds: string[],
  /**
   * Class year per athlete. A result dated before a wrestler could be in high school is somebody
   * else's - Alex Johnson, Class of 2027, read "last competed: 2021 NCHSAA States", an older
   * namesake's result - so it is skipped, as the profile skips it (lib/high-school-window.ts).
   */
  graduationYears?: Map<string, number | null>,
): Promise<Map<string, LastCompeted>> {
  const best = new Map<string, LastCompeted>()
  const ids = [...new Set(athleteIds.filter(Boolean))]
  if (ids.length === 0) return best

  /** Dated results: real dates, and the event's own short name. */
  const results = async (): Promise<Candidate[]> => {
    const out: Candidate[] = []
    for (const part of chunk(ids)) {
      const rows = await allRows((from, to) =>
        supabase
          .from("other_tournament_results")
          .select("athlete_id, event_short_name, event_name, event_date, year")
          .in("athlete_id", part)
          .not("event_date", "is", null)
          .order("id")
          .range(from, to),
      )
      for (const r of rows) {
        const athleteId = String(r.athlete_id ?? "")
        const date = isoDay(r.event_date)
        if (!athleteId || !date) continue
        out.push({ athleteId, entry: { event: String(r.event_short_name ?? r.event_name ?? "Tournament"), date, year: Number(r.year) || Number(date.slice(0, 4)) } })
      }
    }
    return out
  }

  /** The yearly tables, dated to the month each event is held. */
  const yearly = async (): Promise<Candidate[]> => {
    const out: Candidate[] = []
    for (const source of SOURCES) {
      for (const part of chunk(ids)) {
        const rows = await allRows((from, to) =>
          supabase.from(source.table).select(`athlete_id, ${source.yearColumn}`).in("athlete_id", part).range(from, to),
        )
        for (const r of rows) {
          const athleteId = String(r.athlete_id ?? "")
          const year = Number(r[source.yearColumn])
          if (!athleteId || !Number.isFinite(year)) continue
          out.push({ athleteId, entry: { event: source.label, date: `${year}-${source.month}`, year } })
        }
      }
    }
    return out
  }

  /** Every dated bout - the duals live only here. Small chunks: one Fargo entrant is dozens of rows. */
  const bouts = async (): Promise<Candidate[]> => {
    const out: Candidate[] = []
    await Promise.all(
      chunk(ids, 50).map(async (part) => {
        const rows = await allRows((from, to) =>
          supabase
            .from("other_tournament_bouts")
            .select("athlete_id, event_name, event_date")
            .in("athlete_id", part)
            .not("event_date", "is", null)
            .order("id")
            .range(from, to),
        )
        for (const r of rows) {
          const athleteId = String(r.athlete_id ?? "")
          const date = isoDay(r.event_date)
          if (!athleteId || !date) continue
          out.push({ athleteId, entry: { event: boutEventLabel(r.event_name), date, year: Number(date.slice(0, 4)) } })
        }
      }),
    )
    return out
  }

  /** The in-season record: duals and invitationals, dated bout by bout. */
  const season = async (): Promise<Candidate[]> => {
    const out: Candidate[] = []
    await Promise.all(
      chunk(ids, 50).map(async (part) => {
        const rows = await allRows((from, to) =>
          supabase.from("matches").select("athlete_id, matches").in("athlete_id", part).order("id").range(from, to),
        )
        for (const r of rows) {
          const athleteId = String(r.athlete_id ?? "")
          if (!athleteId || !Array.isArray(r.matches)) continue
          for (const bout of r.matches as Array<Record<string, unknown>>) {
            const date = isoDay(bout.date)
            if (!date) continue
            const venue = String(bout.venue ?? bout.tournament ?? "").trim()
            out.push({ athleteId, entry: { event: venue || "Dual", date, year: Number(date.slice(0, 4)) } })
          }
        }
      }),
    )
    return out
  }

  /*
   * Latest date wins. On the same day the earlier source wins - a results row names the event
   * better than a coach's season entry - so the order below is the tie-break, and it is fixed
   * however the queries finish.
   */
  const sources = await Promise.all([results(), bouts(), season(), yearly()])
  for (const candidates of sources) {
    for (const { athleteId, entry } of candidates) {
      const grad = graduationYears?.get(athleteId) ?? null
      if (grad && entry.date < highSchoolStart(grad)) continue
      const current = best.get(athleteId)
      if (!current || entry.date > current.date) {
        best.set(athleteId, { ...entry, event: canonicalEventLabel(entry.event) })
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
