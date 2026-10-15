/**
 * The North Carolina wrestlers a coach searches and picks from, with the weight each last
 * competed at.
 *
 * One list for Coach Home's search, the comparison's pickers and the perfect-recruit page. The
 * weight is the last one competed (lib/prospect-last-competed.ts), not `athletes.weightclass`:
 * a third of profiles list a weight that is not what the wrestler last made (199 of 483 on
 * 10 October 2026). The listed weight is only the fallback, for a wrestler with no result on file.
 *
 * Cached for an hour: the sweep over every result table takes a few seconds and the answer
 * changes only when results are imported.
 */
import "server-only"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { currentClassYears } from "@/lib/class-years"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { HOME_STATE, inState } from "@/lib/recruiting/states"

export type CoachRosterAthlete = {
  id: string
  name: string
  highschool: string | null
  graduationyear: number | null
  /** Last competed weight; the listed weight only when nothing is on file. */
  weightclass: string | null
}

/** One state's wrestlers; North Carolina, as before, when none is named (lib/recruiting/states.ts). */
async function build(state: string = HOME_STATE): Promise<CoachRosterAthlete[]> {
  const admin = createAdminClient()
  const active = currentClassYears()
  const { data, error } = await inState(admin.from("athletes").select("id,name,highschool,graduationyear,weightclass"), state)
    .gte("graduationyear", active[0]!)
    .lte("graduationyear", active[active.length - 1]!)
    .order("name")
    .limit(2000)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as CoachRosterAthlete[]
  const last = await loadLastCompeted(
    admin,
    rows.map((r) => r.id),
    new Map(rows.map((r) => [r.id, Number(r.graduationyear) || null])),
  ).catch(() => new Map())
  return rows.map((r) => ({ ...r, weightclass: last.get(r.id)?.weight ?? (r.weightclass ? String(r.weightclass) : null) }))
}

export const loadCoachRoster = unstable_cache(build, ["coach-roster", "v1"], { revalidate: 3600, tags: ["coach-roster"] })
