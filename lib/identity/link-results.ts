/**
 * Decide and store which profile tournament results belong to - the one routine every caller uses.
 *
 * Profiles read results through result_athlete_links (RESULT_LINKS_READ=1), so a result nobody has
 * linked does not show. Three callers keep that from happening:
 *
 *   - importers, right after they insert, for the rows they wrote;
 *   - the hourly cron, for rows and profiles created or changed since its last run, which catches
 *     script and SQL imports and a profile created after its results were imported;
 *   - scripts/identity/backfill-result-links.ts, for everything.
 *
 * Every caller makes the same decisions with `decideLink`. A row a person reviewed is never
 * rewritten, and a row this run no longer links or queues is removed only if nobody reviewed it.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  LINK_MATCHER_VERSION,
  buildNameIndex,
  decideLink,
  type AthleteForLink,
  type LinkCandidate,
  type ResultRowForLink,
} from "@/lib/identity/result-athlete-link"

type Source = {
  table: string
  select: string
  /** Column holding the wrestler's name, for finding a changed profile's results. */
  nameColumn: string
  /** Timestamps a row carries; "new since" means any of them is in the window. */
  timeColumns?: string[]
  map: (r: Record<string, any>) => ResultRowForLink
}

export const LINK_SOURCES: Source[] = [
  { table: "wrestling_nchsaa_results", nameColumn: "wrestler_name", select: "id,wrestler_name,school,year,classification,athlete_id",
    map: (r) => ({ name: r.wrestler_name, school: r.school, year: r.year, state: "NC", existingAthleteId: r.athlete_id, highSchoolSeason: true, middleSchoolEligible: r.classification === "NCISA" }) },
  { table: "nhsca_placements", nameColumn: "athlete_name", select: "id,athlete_name,high_school,year,division,state,athlete_id",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.year, division: r.division, state: r.state, existingAthleteId: r.athlete_id }) },
  { table: "wrestling_nhsca_results", nameColumn: "athlete_name", select: "id,athlete_name,high_school,year,division,state",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.year, division: r.division, state: r.state }) },
  { table: "super32_results", nameColumn: "athlete_name", select: "id,athlete_name,high_school,school,year,state",
    map: (r) => ({ name: r.athlete_name, school: r.high_school || r.school, year: r.year, state: r.state, schoolMayBeClub: true }) },
  { table: "fargo_results", nameColumn: "athlete_name", select: "id,athlete_name,high_school,year,state,athlete_id",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.year, state: r.state, existingAthleteId: r.athlete_id, schoolMayBeClub: true }) },
  { table: "other_tournament_results", nameColumn: "athlete_name", select: "id,athlete_name,high_school,year,state,athlete_id",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.year, state: r.state, existingAthleteId: r.athlete_id }) },
  { table: "national_rankings", nameColumn: "athlete_name", timeColumns: ["created_at"], select: "id,athlete_name,high_school,ranking_month,class_year,state,athlete_id",
    map: (r) => ({ name: r.athlete_name, school: r.high_school, year: r.ranking_month ? Number(String(r.ranking_month).slice(0, 4)) : null, classYear: r.class_year, state: r.state, existingAthleteId: r.athlete_id }) },
]

export type LinkRunOptions = {
  /** Only rows created or updated at or after this ISO time, plus results of profiles changed since. */
  since?: string
  /** Only these rows (importers pass what they just inserted). */
  rowIds?: Partial<Record<string, string[]>>
  /** Decide but write nothing. */
  dryRun?: boolean
}

export type LinkReviewItem = { table: string; id: string; row: ResultRowForLink; reason: string; candidates: LinkCandidate[] }

export type LinkRunResult = {
  summary: Record<string, Record<string, number>>
  review: LinkReviewItem[]
  written: number
  removed: number
  keptReviewed: number
}

async function pageAll(build: (from: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>) {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

function lastNameToken(name: string): string | null {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const last = parts[parts.length - 1]?.split("-")[0]
  return last && last.length >= 2 ? last : null
}

export async function linkResults(admin: SupabaseClient, options: LinkRunOptions = {}): Promise<LinkRunResult> {
  const athleteRows = await pageAll((from) =>
    admin.from("athletes").select("id,name,wrestling_name,graduationyear,highschool,wrestlingClub,state,created_at,updated_at").order("id").range(from, from + 999),
  )
  const athletes: AthleteForLink[] = athleteRows.map((a) => ({
    id: a.id, name: a.name ?? "", wrestlingName: a.wrestling_name, graduationYear: a.graduationyear, highSchool: a.highschool, club: a.wrestlingClub, state: a.state,
  }))
  const find = buildNameIndex(athletes)

  // Profiles created or changed since the window opened: their results may already be on file.
  const changedSurnames = options.since
    ? [...new Set(
        athleteRows
          .filter((a) => String(a.created_at ?? "") >= options.since! || String(a.updated_at ?? "") >= options.since!)
          .flatMap((a) => [a.name, a.wrestling_name].filter(Boolean).map((n: string) => lastNameToken(n)))
          .filter((t): t is string => Boolean(t)),
      )]
    : []

  const result: LinkRunResult = { summary: {}, review: [], written: 0, removed: 0, keptReviewed: 0 }
  const records: Record<string, unknown>[] = []
  const evaluated: Array<{ table: string; id: string }> = []

  for (const src of LINK_SOURCES) {
    let rows: any[]
    if (options.rowIds) {
      const ids = options.rowIds[src.table] ?? []
      rows = []
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await admin.from(src.table).select(src.select).in("id", ids.slice(i, i + 200))
        if (error) throw new Error(`${src.table}: ${error.message}`)
        rows.push(...(data ?? []))
      }
    } else if (options.since) {
      const recent = await pageAll((from) =>
        admin.from(src.table).select(src.select)
          .or((src.timeColumns ?? ["created_at", "updated_at"]).map((c) => `${c}.gte.${options.since}`).join(","))
          .order("id").range(from, from + 999),
      )
      const byName: any[] = []
      for (let i = 0; i < changedSurnames.length; i += 20) {
        const filter = changedSurnames.slice(i, i + 20).map((s) => `${src.nameColumn}.ilike.%${s.replace(/[%,()]/g, "")}%`).join(",")
        const { data, error } = await admin.from(src.table).select(src.select).or(filter).limit(2000)
        if (error) throw new Error(`${src.table}: ${error.message}`)
        byName.push(...(data ?? []))
      }
      const seen = new Set<string>()
      rows = [...recent, ...byName].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    } else {
      rows = await pageAll((from) => admin.from(src.table).select(src.select).order("id").range(from, from + 999))
    }

    const tally: Record<string, number> = { rows: rows.length }
    for (const r of rows) {
      evaluated.push({ table: src.table, id: r.id })
      const row = src.map(r)
      const d = decideLink(row, find(row.name ?? ""))
      const key = d.status === "no_match" ? d.reason : d.status
      tally[key] = (tally[key] ?? 0) + 1
      if (d.status === "linked" && row.existingAthleteId) tally.existing_confirmed = (tally.existing_confirmed ?? 0) + 1
      if (d.status === "linked" && !row.existingAthleteId) tally.newly_linked = (tally.newly_linked ?? 0) + 1
      if (d.status === "review") result.review.push({ table: src.table, id: r.id, row, reason: d.reason, candidates: d.candidates })
      if (d.status !== "no_match") {
        records.push({
          source_table: src.table,
          source_id: r.id,
          athlete_id: d.status === "linked" ? d.athleteId : null,
          status: d.status,
          method: d.status === "linked" && row.existingAthleteId ? "existing" : "auto",
          score: d.status === "linked" ? d.score : null,
          reason: d.reason,
          candidates: d.candidates,
          matcher_version: LINK_MATCHER_VERSION,
        })
      }
    }
    result.summary[src.table] = tally
  }

  if (options.dryRun || !evaluated.length) return result

  // What is already stored for the rows evaluated: reviewed rows are final; the rest may change.
  const stored: Array<{ id: string; source_table: string; source_id: string; reviewed_at: string | null }> = []
  const evaluatedByTable = new Map<string, string[]>()
  for (const e of evaluated) evaluatedByTable.set(e.table, [...(evaluatedByTable.get(e.table) ?? []), e.id])
  for (const [table, ids] of evaluatedByTable) {
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await admin
        .from("result_athlete_links")
        .select("id,source_table,source_id,reviewed_at")
        .eq("source_table", table)
        .in("source_id", ids.slice(i, i + 200))
      if (error) throw new Error(`result_athlete_links: ${error.message}`)
      stored.push(...((data ?? []) as typeof stored))
    }
  }
  const reviewed = new Set(stored.filter((s) => s.reviewed_at).map((s) => `${s.source_table}|${s.source_id}`))
  result.keptReviewed = reviewed.size

  const now = new Date().toISOString()
  const toWrite = records
    .filter((r) => !reviewed.has(`${r.source_table}|${r.source_id}`))
    .map((r) => ({ ...r, updated_at: now }))
  for (let i = 0; i < toWrite.length; i += 500) {
    const { error } = await admin.from("result_athlete_links").upsert(toWrite.slice(i, i + 500), { onConflict: "source_table,source_id" })
    if (error) throw new Error(`write: ${error.message}`)
  }
  result.written = toWrite.length

  // Rows these rules no longer link or queue (no profile, or a namesake) - unless a person decided them.
  const current = new Set(records.map((r) => `${r.source_table}|${r.source_id}`))
  const stale = stored.filter((s) => !s.reviewed_at && !current.has(`${s.source_table}|${s.source_id}`)).map((s) => s.id)
  for (let i = 0; i < stale.length; i += 200) {
    const { error } = await admin.from("result_athlete_links").delete().in("id", stale.slice(i, i + 200))
    if (error) throw new Error(`cleanup: ${error.message}`)
  }
  result.removed = stale.length
  return result
}
