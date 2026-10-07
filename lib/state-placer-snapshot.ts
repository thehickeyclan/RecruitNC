import { gunzipSync, gzipSync } from "zlib"
import { list, put } from "@vercel/blob"

/**
 * The all-states placer index, saved as a file.
 *
 * Building it reads ~120,000 state_tournament_placers rows and name-matches 86,000 placers against
 * each other: about a minute, most of it synchronous. Built inside a request, that blocked every
 * profile and the significant-wins section (7 Oct 2026). The cron (/api/cron/state-placer-index)
 * builds it every six hours and saves it here - 22 MB of JSON, 2.7 MB gzipped - and requests read
 * the saved copy in under a second.
 *
 * Public tournament results only, so a public blob is fine.
 */
const SNAPSHOT_PATH = "snapshots/state-placer-index-all.json.gz"

export type PlacerSnapshot<T> = { year: number; builtAt: string; index: T }

export async function saveStatePlacerSnapshot<T>(index: T, year: number): Promise<{ url: string; bytes: number }> {
  const body = gzipSync(JSON.stringify({ year, builtAt: new Date().toISOString(), index } satisfies PlacerSnapshot<T>))
  const blob = await put(SNAPSHOT_PATH, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/gzip",
    cacheControlMaxAge: 60,
  })
  return { url: blob.url, bytes: body.length }
}

export async function readStatePlacerSnapshot<T>(): Promise<PlacerSnapshot<T> | null> {
  const { blobs } = await list({ prefix: SNAPSHOT_PATH, limit: 1 })
  const url = blobs[0]?.url
  if (!url) return null
  const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" })
  if (!response.ok) return null
  const parsed = JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8")) as PlacerSnapshot<T>
  return parsed?.index ? parsed : null
}
