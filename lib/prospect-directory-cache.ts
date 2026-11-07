/**
 * The athletes directory's rows, cached (Matt, 2 Nov 2026: "it takes a long time to load").
 *
 * Every visit to /prospects/all used to read the directory, then every row's honours and last
 * competed result: about nine seconds of queries, repeated for each visitor. Cached here for ten
 * minutes, one entry per state and class year so each stays under the data cache's 2 MB limit,
 * and served stale while a fresh copy is built.
 */
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchProspectDirectoryAll, type ProspectDirectoryRow } from "@/lib/prospects-directory"
import { highestAchievement, loadAchievements } from "@/lib/prospect-achievements"
import { lastCompetedLabel, loadLastCompeted } from "@/lib/prospect-last-competed"

export const PROSPECT_DIRECTORY_TAG = "prospect-directory"

async function buildSlice(state: string, classYear: number): Promise<ProspectDirectoryRow[]> {
  const supabase = createAdminClient()
  const rows = (await fetchProspectDirectoryAll(supabase, { state, graduationYear: String(classYear) })) as Array<
    Record<string, unknown> & { id: string; name?: string | null; graduationyear?: unknown }
  >
  const ids = rows.map((p) => String(p.id))
  /*
   * Achievements come from the tables that hold them, not from JSON on the athlete row: the
   * client once derived them from a column that does not exist, and "State Champion" found two
   * wrestlers out of 261 instead of 37.
   */
  const [facts, lastCompeted] = await Promise.all([
    loadAchievements(supabase, rows.map((p) => ({ id: p.id, name: p.name ?? null }))),
    loadLastCompeted(supabase, ids, new Map(rows.map((p) => [String(p.id), Number(p.graduationyear) || null]))),
  ])
  return rows.map((p) => ({
    ...p,
    achievement_facts: facts.get(String(p.id)) ?? {},
    achievement_level: highestAchievement(facts.get(String(p.id)) ?? {}).level,
    last_competed: lastCompetedLabel(lastCompeted.get(String(p.id))),
    last_competed_weight: lastCompeted.get(String(p.id))?.weight ?? null,
  })) as unknown as ProspectDirectoryRow[]
}

const cachedSlice = unstable_cache(buildSlice, ["prospect-directory-slice-v2"], { revalidate: 600, tags: [PROSPECT_DIRECTORY_TAG] })

/*
 * How many slices may be built at once.
 *
 * This was an unbounded Promise.all, which was fine while "ALL" meant five live states: twenty
 * slices, each a handful of queries. On 6 November 2026 the platform went from 5 live states to
 * 41 in one evening and the same line became 168 concurrent slice builds from a SINGLE request -
 * each one paging the directory and then loading achievements and last-competed on top. On a cold
 * cache that is several hundred concurrent Postgres queries for one page view, which exhausted the
 * pool and took /prospects/all to a 500 in production.
 *
 * The lesson is not the number. It is that a per-live-state fan-out is a cost that grows with the
 * product, so it needs a ceiling that does not: see [[request-paths-must-not-read-whole-tables]].
 */
const SLICE_CONCURRENCY = 6

/** Run the tasks at most SLICE_CONCURRENCY at a time, preserving order. */
async function inBatches<T>(tasks: ReadonlyArray<() => Promise<T>>, limit: number): Promise<T[]> {
  const out: T[] = new Array(tasks.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= tasks.length) return
      out[i] = await tasks[i]()
    }
  })
  await Promise.all(workers)
  return out
}

/** Every wrestler in these states and class years, honours and last competed included; one row per wrestler. */
export async function loadDirectoryRows(states: readonly string[], classYears: readonly number[]): Promise<ProspectDirectoryRow[]> {
  const slices = await inBatches(
    states.flatMap((st) => classYears.map((y) => () => cachedSlice(st, y))),
    SLICE_CONCURRENCY,
  )
  const seen = new Set<string>()
  const out: ProspectDirectoryRow[] = []
  for (const row of slices.flat()) {
    const id = String((row as { id: string }).id)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}
