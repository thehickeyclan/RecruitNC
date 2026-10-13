import { gunzipSync, gzipSync } from "zlib"
import { list, put } from "@vercel/blob"

import type { CollegeDivision } from "@/lib/college-programs/types"
import type { GpaStats, Standing } from "@/lib/college-programs/went-here-stats"

/**
 * "NC wrestlers who went here", saved as a file - the same arrangement as the placer index
 * (lib/state-placer-snapshot.ts). Building it runs the credential engine for every committed
 * wrestler, about half a minute; the cron (/api/cron/college-went-here) does that every six hours
 * and a card reads the saved copy.
 *
 * The blob is public, so it holds only what the site already publishes: who committed where and
 * what they won. **No wrestler's GPA is in it** - only the averages, and only for groups of five
 * or more, worked out before saving.
 */
const SNAPSHOT_PATH = "snapshots/college-went-here.json.gz"

export type SnapshotCommit = {
  athleteId: string
  name: string
  classYear: number | null
  highSchool: string | null
  results: string[]
  schoolId: string
  division: CollegeDivision
  standing: Standing
  /**
   * Men's or women's wrestling, from the profile. Absent in a snapshot saved before 13 Oct 2026
   * and null for a profile with no gender; such a commit is in the combined figures only.
   */
  gender?: "mens" | "womens" | null
}

export type WentHereSnapshot = {
  builtAt: string
  commits: SnapshotCommit[]
  gpaBySchool: Record<string, GpaStats>
  gpaByDivision: Partial<Record<CollegeDivision, GpaStats>>
  /** The same averages for one of men's or women's, keyed "school-id|womens" and "NAIA|womens". Five or more only. */
  gpaBySchoolGender?: Record<string, GpaStats>
  gpaByDivisionGender?: Record<string, GpaStats>
}

export async function saveWentHereSnapshot(snapshot: WentHereSnapshot): Promise<{ bytes: number }> {
  const body = gzipSync(JSON.stringify(snapshot))
  await put(SNAPSHOT_PATH, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/gzip",
    cacheControlMaxAge: 60,
  })
  return { bytes: body.length }
}

let cached: { at: number; value: WentHereSnapshot } | null = null
const TEN_MINUTES = 600_000

/** Null until the cron has run once; a card then shows nothing rather than building it in a request. */
export async function readWentHereSnapshot(): Promise<WentHereSnapshot | null> {
  if (cached && Date.now() - cached.at < TEN_MINUTES) return cached.value
  const { blobs } = await list({ prefix: SNAPSHOT_PATH, limit: 1 })
  const url = blobs[0]?.url
  if (!url) return null
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" })
  if (!response.ok) return null
  const value = JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8")) as WentHereSnapshot
  if (!Array.isArray(value?.commits)) return null
  cached = { at: Date.now(), value }
  return value
}
